import {Component, inject, OnInit, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormBuilder, FormsModule, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {Player, Score} from '../models/score';
import {ScoreService} from '../services/score-service';
import {ScoreScatterPlot} from '../score-scatter-plot/score-scatter-plot';

@Component({
  selector: 'app-score-comparison',
  imports: [DatePipe, FormsModule, ReactiveFormsModule, MatButton, MatIcon, ScoreScatterPlot],
  templateUrl: './score-comparison.html',
  styleUrl: './score-comparison.scss'
})
export class ScoreComparison implements OnInit {
  players = signal<Player[]>([]);
  playerNames = signal<Record<string, string>>({});
  scores = signal<Record<string, Score[]>>({});
  selectedPlayer = '';
  selectedOtherPlayer = '';
  compareMode = false;
  maximumDate = '';
  earliestScoreTimestamp = Date.now();
  latestScoreTimestamp = Date.now();
  selectedDateTimestamp = Date.now();
  loading = signal(true);
  refreshing = signal(false);
  error = signal('');
  addingPlayer = signal(false);
  addPlayerError = signal('');
  readonly addPlayerForm = inject(FormBuilder).nonNullable.group({
    playerId: ['', [Validators.required, Validators.pattern(/^[0-9]{1,20}$/)]]
  }, {updateOn: 'blur'});

  constructor(private readonly scoreService: ScoreService) {
  }

  ngOnInit(): void {
    this.loadPlayers();
  }

  addPlayer(): void {
    if (this.addingPlayer()) {
      return;
    }
    const playerId = this.addPlayerForm.controls.playerId.value.trim();
    this.addPlayerForm.controls.playerId.setValue(playerId);
    this.addPlayerError.set('');
    if (this.addPlayerForm.invalid) {
      this.addPlayerForm.markAllAsTouched();
      return;
    }
    if (this.players().some(player => player.id === playerId)) {
      this.addPlayerError.set('This player is already tracked.');
      return;
    }
    this.addingPlayer.set(true);
    this.scoreService.addPlayer(playerId).subscribe({
      next: player => {
        this.players.update(players => [...players.filter(existing => existing.id !== player.id), player]);
        this.playerNames.update(names => ({...names, [player.id]: player.name}));
        this.selectedOtherPlayer ||= this.selectedPlayer || player.id;
        this.selectedPlayer = player.id;
        this.addPlayerForm.reset();
        this.loadComparison();
      },
      error: error => {
        this.addingPlayer.set(false);
        this.addPlayerError.set(error.status === 404
          ? 'No ScoreSaber player was found with this ID.'
          : 'Could not add the player. Please try again.');
      },
      complete: () => this.addingPlayer.set(false)
    });
  }

  loadComparison(): void {
    if (!this.selectedPlayer) {
      return;
    }
    this.loading.set(true);
    this.error.set('');
    if (this.compareMode && this.selectedOtherPlayer) {
      this.scoreService.compareScores(this.selectedPlayer, this.selectedOtherPlayer).subscribe({
        next: scores => {
          this.scores.set(scores);
          this.updateDateRange(scores);
        },
        error: () => {
          this.loading.set(false);
          this.error.set('Could not load the score comparison.');
        },
        complete: () => this.loading.set(false)
      });
      return;
    }
    this.scoreService.getScores(this.selectedPlayer).subscribe({
      next: scores => {
        const scoreMap = {[this.selectedPlayer]: scores};
        this.scores.set(scoreMap);
        this.updateDateRange(scoreMap);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load the score comparison.');
      },
      complete: () => this.loading.set(false)
    });
  }

  onDateSliderChange(value: string): void {
    this.selectedDateTimestamp = Number(value);
    this.maximumDate = new Date(this.selectedDateTimestamp).toISOString();
  }

  onCompareModeChange(): void {
    this.loadComparison();
  }

  refreshScores(): void {
    if (!this.selectedPlayer) {
      return;
    }
    this.refreshing.set(true);
    this.scoreService.updateScores(this.selectedPlayer).subscribe({
      next: () => this.loadComparison(),
      error: () => {
        this.refreshing.set(false);
        this.error.set('Could not refresh scores from ScoreSaber.');
      },
      complete: () => this.refreshing.set(false)
    });
  }

  private loadPlayers(): void {
    this.scoreService.getPlayers().subscribe({
      next: players => {
        this.players.set(players);
        this.playerNames.set(Object.fromEntries(players.map(player => [player.id, player.name])));
        this.selectedPlayer = players[0]?.id ?? '';
        this.selectedOtherPlayer = players[1]?.id ?? players[0]?.id ?? '';
        this.loading.set(false);
        this.loadComparison();
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Could not load ScoreSaber players.');
      }
    });
  }

  private updateDateRange(scores: Record<string, Score[]>): void {
    const timestamps = Object.values(scores)
      .flat()
      .map(score => score.timeSetMillis)
      .filter(timestamp => Number.isFinite(timestamp));
    this.earliestScoreTimestamp = timestamps.length ? Math.min(...timestamps) : Date.now();
    this.latestScoreTimestamp = Date.now();
    this.selectedDateTimestamp = this.latestScoreTimestamp;
    this.maximumDate = new Date(this.selectedDateTimestamp).toISOString();
  }
}
