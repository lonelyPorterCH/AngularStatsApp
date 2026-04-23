import {Component, OnInit, signal} from '@angular/core';
import {StatsCard} from '../stats-card/stats-card';
import {StatService} from '../services/stat-service';
import {Stat} from '../models/stat.model';

@Component({
  selector: 'app-stats-list',
  imports: [
    StatsCard
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
