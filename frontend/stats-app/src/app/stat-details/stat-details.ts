import {Component, OnInit, signal} from '@angular/core';
import {Stat} from '../models/stat';
import {StatService} from '../services/stat-service';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {ChartComponent} from '../chart/chart';
import {MatIcon} from '@angular/material/icon';
import {MatDialog} from '@angular/material/dialog';
import {ConfirmDialog} from '../confirm-dialog/confirm-dialog';
import {Title} from '@angular/platform-browser';

@Component({
  selector: 'app-stat-details',
  imports: [
    MatButton,
    RouterLink,
    ChartComponent,
    MatIcon
  ],
  templateUrl: './stat-details.html',
  styleUrl: './stat-details.css',
})
export class StatDetails implements OnInit {
  stat = signal<Stat | undefined>(undefined);
  loading = signal<boolean>(true);
  notFound = signal<boolean>(false);

  constructor(
    private statService: StatService,
    private route: ActivatedRoute,
    private dialog: MatDialog,
    private router: Router,
    private title: Title) {
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
        this.title.setTitle(`StatsApp - ${data.title}`);
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

  onDelete(): void {
    const dialogRef = this.dialog.open(ConfirmDialog);

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.statService.deleteStat(this.stat()!.id).subscribe({
          next: () => this.router.navigate(['/stats']),
          error: err => console.error(err)
        });
      }
    });
  }
}
