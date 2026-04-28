import {Component, OnInit, signal} from '@angular/core';
import {StatsCard} from '../stats-card/stats-card';
import {StatService} from '../services/stat-service';
import {Stat} from '../models/stat';
import {MatButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-stats-list',
  imports: [
    StatsCard,
    MatButton,
    MatIcon,
    RouterLink
  ],
  templateUrl: './stats-list.html',
  styleUrl: './stats-list.scss',
})
export class StatsList implements OnInit {
  stats = signal<Stat[]>([]);

  constructor(private statService: StatService) {
  }

  ngOnInit(): void {
    this.statService.getStats().subscribe({
      next: data => {
        this.stats.set(data);
      },
      error: err => {
        console.log(err);
      }
    });
  }
}
