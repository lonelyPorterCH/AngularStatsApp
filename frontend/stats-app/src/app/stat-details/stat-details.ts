import {Component, OnInit, signal} from '@angular/core';
import {Stat} from '../models/stat.model';
import {StatService} from '../services/stat-service';
import {ActivatedRoute, RouterLink} from '@angular/router';
import {MatButton} from '@angular/material/button';

@Component({
  selector: 'app-stat-details',
  imports: [
    MatButton,
    RouterLink
  ],
  templateUrl: './stat-details.html',
  styleUrl: './stat-details.css',
})
export class StatDetails implements OnInit {
  stat = signal<Stat | undefined>(undefined);

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
      },
      error: err => {
        console.error(err);
      }
    })
  }
}
