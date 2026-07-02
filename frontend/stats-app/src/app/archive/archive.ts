import {Component, OnInit, signal} from '@angular/core';
import {Stat} from '../models/stat';
import {StatService} from '../services/stat-service';
import {MatButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {RouterLink} from '@angular/router';
import {StatsCard} from '../stats-card/stats-card';

@Component({
  selector: 'app-archive',
  imports: [
    StatsCard,
    MatButton,
    MatIcon,
    RouterLink
  ],
  templateUrl: './archive.html',
  styleUrl: './archive.scss',
})
export class Archive implements OnInit {
  stats = signal<Stat[]>([]);

  constructor(private statService: StatService) {
  }

  ngOnInit(): void {
    this.statService.getArchivedStats().subscribe({
      next: data => {
        this.stats.set(data);
      },
      error: err => {
        console.log(err);
      }
    });
  }
}
