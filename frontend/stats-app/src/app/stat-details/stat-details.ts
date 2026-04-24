import {Component, OnInit, signal} from '@angular/core';
import {Stat} from '../models/stat';
import {StatService} from '../services/stat-service';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {ChartComponent} from '../chart/chart';

@Component({
  selector: 'app-stat-details',
  imports: [
    MatButton,
    RouterLink,
    ChartComponent
  ],
  templateUrl: './stat-details.html',
  styleUrl: './stat-details.css',
})
export class StatDetails implements OnInit {
  stat = signal<Stat | undefined>(undefined);
  loading = signal<boolean>(true);
  notFound = signal<boolean>(false);

  constructor(private statService: StatService, private route: ActivatedRoute) {
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.loadStatById(id);
      }
    })
  }

  loadStatById(id: string) {
    this.statService.getStatById(id).subscribe({
      next: data => {
        this.stat.set(data);
        this.loading.set(false);
      },
      error: err => {
        this.loading.set(false);

        if (err.status === 404) {
          this.notFound.set(true)
        } else {
          console.error(err);
        }
      }
    })
  }
}
