import {Component, OnInit, signal} from '@angular/core';
import {forkJoin} from 'rxjs';
import {StatsCard} from '../stats-card/stats-card';
import {StatService} from '../services/stat-service';
import {Stat} from '../models/stat';
import {
  appendChart, ChartPlacement, DashboardGroup, DashboardLayout, GRID_COLUMNS, MIN_CHART_HEIGHT, MIN_CHART_WIDTH, placeChart
} from '../models/dashboard-layout';
import {MatButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {RouterLink} from '@angular/router';
import {ScorePreview} from '../score-preview/score-preview';
import {HarvestPreview} from '../harvest-preview/harvest-preview';

@Component({
  selector: 'app-stats-list',
  imports: [StatsCard, MatButton, MatIcon, RouterLink, ScorePreview, HarvestPreview],
  templateUrl: './stats-list.html',
  styleUrl: './stats-list.scss',
})
export class StatsList implements OnInit {
  stats = signal<Stat[]>([]);
  layout = signal<DashboardLayout | null>(null);
  editing = signal(false);
  saving = signal(false);
  error = signal('');
  dragPreview = signal<{groupId: string; chart: ChartPlacement; group: DashboardGroup} | null>(null);
  private savedLayout: DashboardLayout | null = null;
  private dragging: {chart: ChartPlacement; sourceId: string; offsetX: number; offsetY: number} | null = null;
  private resize: {id: string; groupId: string; startX: number; startY: number;
    width: number; height: number; columnStep: number} | null = null;

  constructor(private readonly statService: StatService) {
  }

  ngOnInit(): void {
    forkJoin({stats: this.statService.getStats(), layout: this.statService.getLayout()}).subscribe({
      next: ({stats, layout}) => {
        const known = new Set(layout.groups.flatMap(group => group.charts.map(chart => chart.statisticId)));
        let changed = false;
        for (const stat of [...stats].sort((a, b) => a.title.localeCompare(b.title))) {
          if (!known.has(stat.id)) {
            appendChart(layout.groups[0], stat.id);
            changed = true;
          }
        }
        this.stats.set(stats);
        if (changed) {
          this.statService.saveLayout(layout).subscribe({
            next: () => this.layout.set(layout),
            error: () => this.error.set('Could not initialize the dashboard layout. Please reload the page.')
          });
        } else {
          this.layout.set(layout);
        }
      },
      error: () => this.error.set('Could not load the dashboard. Please reload the page.')
    });
  }

  visibleCharts(group: DashboardGroup): ChartPlacement[] {
    const active = new Set(this.stats().map(stat => stat.id));
    const preview = this.dragPreview();
    const charts = group.charts.filter(chart => active.has(chart.statisticId))
      .sort((a, b) => a.y - b.y || a.x - b.x);
    if (preview?.groupId !== group.id) return charts;
    return charts.map(chart => chart.statisticId === this.dragging?.chart.statisticId
      ? chart : preview.group.charts.find(item => item.statisticId === chart.statisticId) ?? chart);
  }

  statFor(id: string): Stat {
    return this.stats().find(stat => stat.id === id)!;
  }

  startEditing(): void {
    this.savedLayout = structuredClone(this.layout());
    this.editing.set(true);
    this.error.set('');
  }

  cancelEditing(): void {
    if (this.savedLayout) this.layout.set(this.savedLayout);
    this.savedLayout = null;
    this.editing.set(false);
    this.error.set('');
  }

  save(): void {
    const layout = this.layout();
    if (!layout || layout.groups.some(group => !group.title.trim())) {
      this.error.set('Group names cannot be empty.');
      return;
    }
    this.saving.set(true);
    this.statService.saveLayout(layout).subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(false);
        this.savedLayout = null;
        this.error.set('');
      },
      error: () => {
        this.saving.set(false);
        this.error.set('Could not save the dashboard layout. Your edits are still available.');
      }
    });
  }

  addGroup(): void {
    this.updateLayout(layout => layout.groups.push({id: crypto.randomUUID(), title: 'New group', charts: []}));
  }

  renameGroup(id: string, value: string): void {
    this.updateLayout(layout => {
      const group = layout.groups.find(item => item.id === id);
      if (group) group.title = value;
    });
  }

  deleteGroup(id: string): void {
    this.updateLayout(layout => {
      const group = layout.groups.find(item => item.id === id);
      if (!group || id === 'ungrouped') return;
      for (const chart of group.charts) {
        const destination = layout.groups[0];
        const y = Math.max(0, ...destination.charts.map(item => item.y + item.height));
        destination.charts.push({...chart, x: 0, y});
      }
      layout.groups = layout.groups.filter(item => item.id !== id);
    });
  }

  dragStart(event: DragEvent, groupId: string, chart: ChartPlacement): void {
    if (!this.editing() || this.saving()) {
      event.preventDefault();
      return;
    }
    const handle = event.currentTarget as HTMLElement;
    const card = handle.closest('.dashboard-chart');
    if (!card || !event.dataTransfer) {
      event.preventDefault();
      return;
    }
    const bounds = card.getBoundingClientRect();
    this.dragging = {chart: {...chart}, sourceId: groupId,
      offsetX: event.clientX - bounds.left, offsetY: event.clientY - bounds.top};
    event.dataTransfer.setData('text/plain', chart.statisticId);
    event.dataTransfer.effectAllowed = 'move';
    const transparent = document.createElement('canvas');
    transparent.width = transparent.height = 1;
    event.dataTransfer.setDragImage(transparent, 0, 0);
  }

  dragEnd(): void {
    this.dragging = null;
    this.dragPreview.set(null);
  }

  previewDrop(event: DragEvent, group: DashboardGroup): void {
    const dragging = this.dragging;
    if (!this.editing() || this.saving() || !dragging) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
    const grid = event.currentTarget as HTMLElement;
    const bounds = grid.getBoundingClientRect();
    const columnStep = (bounds.width + 16) / GRID_COLUMNS;
    const chart = {...dragging.chart,
      x: Math.max(0, Math.min(GRID_COLUMNS - dragging.chart.width,
        Math.round((event.clientX - bounds.left - dragging.offsetX) / columnStep))),
      y: Math.max(0, Math.round((event.clientY - bounds.top - dragging.offsetY) / 116))};
    const current = this.dragPreview();
    if (current?.groupId === group.id && current.chart.x === chart.x && current.chart.y === chart.y) return;
    const previewGroup = structuredClone(group);
    placeChart(previewGroup, chart);
    this.dragPreview.set({groupId: group.id, chart, group: previewGroup});
  }

  leaveGrid(event: DragEvent, groupId: string): void {
    const grid = event.currentTarget as HTMLElement;
    if (this.dragPreview()?.groupId === groupId
      && !(event.relatedTarget instanceof Node && grid.contains(event.relatedTarget))) {
      this.dragPreview.set(null);
    }
  }

  drop(event: DragEvent, groupId: string): void {
    const preview = this.dragPreview();
    const dragging = this.dragging;
    if (!dragging || !preview || preview.groupId !== groupId || !this.editing() || this.saving()) return;
    event.preventDefault();
    this.updateLayout(layout => {
      const source = layout.groups.find(group => group.id === dragging.sourceId);
      const target = layout.groups.find(group => group.id === preview.groupId);
      if (!source || !target) return;
      source.charts = source.charts.filter(chart => chart.statisticId !== dragging.chart.statisticId);
      target.charts = preview.group.charts;
    });
    this.dragEnd();
  }

  startResize(event: PointerEvent, groupId: string, chart: ChartPlacement): void {
    if (this.saving()) return;
    const handle = event.currentTarget as HTMLElement;
    const grid = handle.closest('.dashboard-grid') as HTMLElement | null;
    if (!grid) return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    this.resize = {id: chart.statisticId, groupId, startX: event.clientX, startY: event.clientY,
      width: chart.width, height: chart.height, columnStep: (grid.getBoundingClientRect().width + 16) / GRID_COLUMNS};
  }

  resizeChart(event: PointerEvent): void {
    const resize = this.resize;
    if (!resize) return;
    this.updateLayout(layout => {
      const group = layout.groups.find(item => item.id === resize.groupId);
      const chart = group?.charts.find(item => item.statisticId === resize.id);
      if (!group || !chart) return;
      chart.width = Math.max(MIN_CHART_WIDTH, Math.min(GRID_COLUMNS - chart.x,
        resize.width + Math.round((event.clientX - resize.startX) / resize.columnStep)));
      chart.height = Math.max(MIN_CHART_HEIGHT, resize.height + Math.round((event.clientY - resize.startY) / 116));
      placeChart(group, chart);
    });
  }

  stopResize(): void {
    this.resize = null;
  }

  private updateLayout(update: (layout: DashboardLayout) => void): void {
    const current = this.layout();
    if (!current) return;
    const copy = structuredClone(current);
    update(copy);
    this.layout.set(copy);
  }
}
