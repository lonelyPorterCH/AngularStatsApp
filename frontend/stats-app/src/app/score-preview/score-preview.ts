import {Component, OnInit, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {ScoreService} from '../services/score-service';
import {Player, Score} from '../models/score';
import {ScoreScatterPlot} from '../score-scatter-plot/score-scatter-plot';

@Component({
  selector: 'app-score-preview',
  imports: [RouterLink, MatButton, MatIcon, ScoreScatterPlot],
  templateUrl: './score-preview.html',
  styleUrl: './score-preview.scss'
})
export class ScorePreview implements OnInit {
  players = signal<Player[]>([]);
  playerNames = signal<Record<string, string>>({});
  scores = signal<Record<string, Score[]>>({});
  selectedPlayer = '';
  loading = signal(true);

  constructor(private readonly scoreService: ScoreService) {
  }

  ngOnInit(): void {
    this.scoreService.getPlayers().subscribe({
      next: players => {
        this.players.set(players);
        this.playerNames.set(Object.fromEntries(players.map(player => [player.id, player.name])));
        this.selectedPlayer = players[0]?.id ?? '';
        this.loadScores();
      },
      error: () => this.loading.set(false)
    });
  }

  loadScores(): void {
    if (!this.selectedPlayer) {
      this.loading.set(false);
      return;
    }
    this.scoreService.getScores(this.selectedPlayer).subscribe({
      next: scores => this.scores.set({[this.selectedPlayer]: scores}),
      complete: () => this.loading.set(false),
      error: () => this.loading.set(false)
    });
  }
}
