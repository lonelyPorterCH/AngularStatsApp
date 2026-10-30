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
import {forkJoin} from 'rxjs';
import {MatSlideToggle} from '@angular/material/slide-toggle';

@Component({
  selector: 'app-stat-details',
  imports: [
    MatButton,
    RouterLink,
    ChartComponent,
    MatIcon,
    MatSlideToggle
  ],
  templateUrl: './stat-details.html',
  styleUrl: './stat-details.css',
})
export class StatDetails implements OnInit {
  stat = signal<Stat | undefined>(undefined);
  archived = signal<boolean>(false);
  loading = signal<boolean>(true);
  notFound = signal<boolean>(false);
  smoothingSaving = signal(false);
  smoothingError = signal('');

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
    this.loading.set(true);
    this.notFound.set(false);
    this.smoothingError.set('');

    forkJoin({
      stat: this.statService.getStatById(id),
      archived: this.statService.isArchived(id)
    }).subscribe({
      next: result => {
        this.stat.set(result.stat);
        this.archived.set(result.archived);
        this.loading.set(false);
        this.title.setTitle(`StatsApp - ${result.stat.title}`);
      },
      error: err => {
        this.loading.set(false);

        if (err.status === 404) {
          this.notFound.set(true);
        } else {
          console.error(err);
        }
      }
    });
  }

  onSmoothingChange(smoothing: boolean): void {
    const stat = this.stat();
    if (!stat || this.archived() || this.smoothingSaving()) return;
    this.smoothingError.set('');
    this.smoothingSaving.set(true);
    this.stat.set({...stat, smoothing});
    this.statService.setSmoothing(stat.id, smoothing).subscribe({
      next: () => this.smoothingSaving.set(false),
      error: () => {
        if (this.stat()?.id === stat.id) {
          this.stat.update(current => current ? {...current, smoothing: stat.smoothing ?? false} : current);
          this.smoothingError.set('Could not save smoothing. The previous setting has been restored.');
        }
        this.smoothingSaving.set(false);
      }
    });
  }

  onArchiveToggle(): void {
    const stat = this.stat();
    if (!stat) {
      return;
    }

    this.statService.toggleArchive(stat.id).subscribe({
      next: () => this.loadStatById(stat.id),
      error: err => console.error(err)
    });
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
