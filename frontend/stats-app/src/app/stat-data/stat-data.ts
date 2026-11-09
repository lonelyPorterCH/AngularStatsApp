import {Component, OnInit, signal, viewChild} from '@angular/core';
import {ActivatedRoute, Router, RouterLink} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {MatButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {MatTab, MatTabGroup} from '@angular/material/tabs';
import {forkJoin} from 'rxjs';
import {ChartComponent, ChartPointClickEvent} from '../chart/chart';
import {Stat} from '../models/stat';
import {StatService} from '../services/stat-service';
import {AddPointForm} from '../stat-edit/add-point-form/add-point-form';
import {EditDeleteForm} from '../stat-edit/edit-delete-form/edit-delete-form';
import {ManageDatasetsForm} from '../stat-edit/manage-datasets-form/manage-datasets-form';

@Component({
  selector: 'app-stat-data',
  imports: [RouterLink, MatButton, MatIcon, ChartComponent, MatTabGroup, MatTab,
    AddPointForm, EditDeleteForm, ManageDatasetsForm],
  templateUrl: './stat-data.html',
  styleUrl: './stat-data.css'
})
export class StatData implements OnInit {
  stat = signal<Stat | undefined>(undefined);
  error = signal('');
  tabGroup = viewChild<MatTabGroup>('tabGroup');
  editDeleteForm = viewChild<EditDeleteForm>('editDeleteForm');

  constructor(
    private statService: StatService,
    private route: ActivatedRoute,
    private router: Router,
    private title: Title) {
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) this.loadStatById(id);
    });
  }

  loadStatById(id: string): void {
    this.stat.set(undefined);
    this.error.set('');
    forkJoin({
      stat: this.statService.getStatById(id),
      archived: this.statService.isArchived(id)
    }).subscribe({
      next: result => {
        if (result.archived) {
          void this.router.navigate(['/stats', id]);
          return;
        }
        this.stat.set(result.stat);
        this.title.setTitle(`StatsApp - Manage data - ${result.stat.title}`);
      },
      error: err => {
        if (err.status === 404) {
          void this.router.navigate(['/stats', id]);
          return;
        }
        this.error.set('Could not load chart data. Please reload the page to try again.');
      }
    });
  }

  reloadStat(): void {
    const stat = this.stat();
    if (!stat) return;
    this.error.set('');
    this.statService.getStatById(stat.id).subscribe({
      next: data => {
        if (this.stat()?.id === stat.id) this.stat.set(data);
      },
      error: () => {
        if (this.stat()?.id === stat.id) {
          this.error.set('Could not refresh chart data. Please reload the page before making further changes.');
        }
      }
    });
  }

  onChartPointClick(event: ChartPointClickEvent): void {
    const stat = this.stat();
    const tabGroup = this.tabGroup();
    if (tabGroup) tabGroup.selectedIndex = 2;
    setTimeout(() => {
      if (this.stat()?.id === stat?.id) {
        this.editDeleteForm()?.prefillPoint(event.datasetLabel, event.point);
      }
    });
  }
}
