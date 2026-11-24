import {Component, computed, OnInit, signal} from '@angular/core';
import {NgTemplateOutlet} from '@angular/common';
import {forkJoin} from 'rxjs';
import {StatsCard} from '../stats-card/stats-card';
import {StatService} from '../services/stat-service';
import {Stat} from '../models/stat';
import {
  appendChart, ChartPlacement, DashboardLayout, GRID_COLUMNS, MIN_CHART_HEIGHT, MIN_CHART_WIDTH, placeChart
} from '../models/dashboard-layout';
import {MatButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {RouterLink} from '@angular/router';
import {ScorePreview} from '../score-preview/score-preview';
import {HarvestPreview} from '../harvest-preview/harvest-preview';

@Component({
  selector: 'app-stats-list',
  imports: [NgTemplateOutlet, StatsCard, MatButton, MatIcon, RouterLink, ScorePreview, HarvestPreview],
  templateUrl: './stats-list.html',
  styleUrl: './stats-list.scss',
})
export class StatsList implements OnInit {
  stats = signal<Stat[]>([]);
  layout = signal<DashboardLayout | null>(null);
  editing = signal(false);
  saving = signal(false);
  error = signal('');
  dragPreview = signal<{groupId: string | null; chart: ChartPlacement; charts: ChartPlacement[]} | null>(null);
  resizePreview = signal<{groupId: string | null; chart: ChartPlacement; charts: ChartPlacement[]} | null>(null);
  placementPreview = computed(() => this.resizePreview() ?? this.dragPreview());
  liveChart = signal<{id: string; width: number; height: number; left?: number; top?: number} | null>(null);
  private savedLayout: DashboardLayout | null = null;
  private dragging: {chart: ChartPlacement; sourceId: string | null; offsetX: number; offsetY: number} | null = null;
  private resize: {id: string; groupId: string | null; startX: number; startY: number;
    width: number; height: number; columnStep: number} | null = null;

  constructor(private readonly statService: StatService) {
  }

  ngOnInit(): void {
    forkJoin({stats: this.statService.getStats(), layout: this.statService.getLayout()}).subscribe({
      next: ({stats, layout}) => {
        const known = new Set([...layout.charts, ...layout.groups.flatMap(group => group.charts)]
          .map(chart => chart.statisticId));
        let changed = false;
        for (const stat of [...stats].sort((a, b) => a.title.localeCompare(b.title))) {
          if (!known.has(stat.id)) {
            appendChart(layout.charts, stat.id);
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

  visibleCharts(placements: ChartPlacement[], groupId: string | null): ChartPlacement[] {
    const active = new Set(this.stats().map(stat => stat.id));
    const preview = this.placementPreview();
    const charts = placements.filter(chart => active.has(chart.statisticId))
      .sort((a, b) => a.y - b.y || a.x - b.x);
    if (!preview || preview.groupId !== groupId) return charts;
    return charts.map(chart => chart.statisticId === preview.chart.statisticId
      ? chart : preview.charts.find(item => item.statisticId === chart.statisticId) ?? chart);
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
      if (!group) return;
      const y = Math.max(0, ...layout.charts.map(item => item.y + item.height));
      for (const chart of group.charts) {
        layout.charts.push({...chart, y: chart.y + y});
      }
      layout.groups = layout.groups.filter(item => item.id !== id);
    });
  }

  dragStart(event: DragEvent, groupId: string | null, chart: ChartPlacement): void {
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
    this.liveChart.set({id: chart.statisticId, width: bounds.width, height: bounds.height,
      left: bounds.left, top: bounds.top});
    event.dataTransfer.setData('text/plain', chart.statisticId);
    event.dataTransfer.effectAllowed = 'move';
    const transparent = document.createElement('canvas');
    transparent.width = transparent.height = 1;
    event.dataTransfer.setDragImage(transparent, 0, 0);
  }

  dragEnd(): void {
    this.dragging = null;
    this.dragPreview.set(null);
    this.liveChart.set(null);
  }

  moveChart(event: DragEvent): void {
    const dragging = this.dragging;
    const live = this.liveChart();
    if (!dragging || !live || (event.clientX === 0 && event.clientY === 0)) return;
    this.liveChart.set({...live, left: event.clientX - dragging.offsetX, top: event.clientY - dragging.offsetY});
  }

  previewDrop(event: DragEvent, groupId: string | null, placements: ChartPlacement[]): void {
    const dragging = this.dragging;
    if (!this.editing() || this.saving() || !dragging) return;
    this.moveChart(event);
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
    if (current && current.groupId === groupId && current.chart.x === chart.x && current.chart.y === chart.y) return;
    const charts = placeChart(structuredClone(placements), chart);
    this.dragPreview.set({groupId, chart, charts});
  }

  leaveGrid(event: DragEvent, groupId: string | null): void {
    const grid = event.currentTarget as HTMLElement;
    const preview = this.dragPreview();
    if (preview && preview.groupId === groupId
      && !(event.relatedTarget instanceof Node && grid.contains(event.relatedTarget))) {
      this.dragPreview.set(null);
    }
  }

  drop(event: DragEvent, groupId: string | null): void {
    const preview = this.dragPreview();
    const dragging = this.dragging;
    if (!dragging || !preview || preview.groupId !== groupId || !this.editing() || this.saving()) return;
    event.preventDefault();
    this.updateLayout(layout => {
      const source = this.gridCharts(layout, dragging.sourceId);
      const target = this.gridCharts(layout, preview.groupId);
      if (!source || !target) return;
      this.setGridCharts(layout, dragging.sourceId,
        source.filter(chart => chart.statisticId !== dragging.chart.statisticId));
      this.setGridCharts(layout, preview.groupId, preview.charts);
    });
    this.dragEnd();
  }

  startResize(event: PointerEvent, groupId: string | null, chart: ChartPlacement): void {
    if (!this.editing() || this.saving() || event.button !== 0) return;
    const handle = event.currentTarget as HTMLElement;
    const grid = handle.closest('.dashboard-grid') as HTMLElement | null;
    if (!grid) return;
    event.preventDefault();
    handle.setPointerCapture(event.pointerId);
    this.resize = {id: chart.statisticId, groupId, startX: event.clientX, startY: event.clientY,
      width: chart.width, height: chart.height, columnStep: (grid.getBoundingClientRect().width + 16) / GRID_COLUMNS};
    this.resizeChart(event);
  }

  resizeChart(event: PointerEvent): void {
    const resize = this.resize;
    if (!resize) return;
    const layout = this.layout();
    if (!layout) return;
    const charts = this.gridCharts(layout, resize.groupId);
    const original = charts?.find(item => item.statisticId === resize.id);
    if (!charts || !original) return;
    const chart = {...original,
      width: Math.max(MIN_CHART_WIDTH, Math.min(GRID_COLUMNS - original.x,
        resize.width + Math.round((event.clientX - resize.startX) / resize.columnStep))),
      height: Math.max(MIN_CHART_HEIGHT, resize.height + Math.round((event.clientY - resize.startY) / 116))};
    this.liveChart.set({id: resize.id,
      width: Math.max(MIN_CHART_WIDTH * resize.columnStep - 16,
        Math.min((GRID_COLUMNS - original.x) * resize.columnStep - 16,
          resize.width * resize.columnStep - 16 + event.clientX - resize.startX)),
      height: Math.max(MIN_CHART_HEIGHT * 116 - 16,
        resize.height * 116 - 16 + event.clientY - resize.startY)});
    this.resizePreview.set({groupId: resize.groupId, chart, charts: placeChart(structuredClone(charts), chart)});
  }

  stopResize(): void {
    const preview = this.resizePreview();
    if (this.resize && preview) {
      this.updateLayout(layout => this.setGridCharts(layout, preview.groupId, preview.charts));
    }
    this.cancelResize();
  }

  cancelResize(): void {
    this.resize = null;
    this.resizePreview.set(null);
    this.liveChart.set(null);
  }

  private gridCharts(layout: DashboardLayout, groupId: string | null): ChartPlacement[] | undefined {
    return groupId === null ? layout.charts : layout.groups.find(group => group.id === groupId)?.charts;
  }

  private setGridCharts(layout: DashboardLayout, groupId: string | null, charts: ChartPlacement[]): void {
    if (groupId === null) {
      layout.charts = charts;
    } else {
      const group = layout.groups.find(item => item.id === groupId);
      if (group) group.charts = charts;
    }
  }

  private updateLayout(update: (layout: DashboardLayout) => void): void {
    const current = this.layout();
    if (!current) return;
    const copy = structuredClone(current);
    update(copy);
    this.layout.set(copy);
  }
}
