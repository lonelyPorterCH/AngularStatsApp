import {Component, OnInit} from '@angular/core';
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
  stats: Stat[] = [];

  constructor(private statService: StatService) {
  }

  ngOnInit(): void {
    this.stats = this.statService.getStats();
  }
}
