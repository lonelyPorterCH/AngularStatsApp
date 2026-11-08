import {AfterViewInit, Component, computed, ElementRef, Input, OnChanges, OnDestroy, signal, SimpleChanges, viewChild} from '@angular/core';
import {DatePipe, DecimalPipe} from '@angular/common';
import {MatButton, MatIconButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {Chart, ChartDataset, registerables, TooltipModel} from 'chart.js';
import 'chartjs-adapter-luxon';
import {Score} from '../models/score';
import {DEFAULT_DATASET_COLORS} from '../models/dataset-colors';
import {buildBeatSaberPlaylist} from './beatsaber-playlist';

Chart.register(...registerables);

export function selectLatestScoresBySongAndLeaderboard(
  scoresByPlayer: Record<string, Score[]>,
  maximumDate?: string
): Record<string, Score[]> {
  const maximumTimestamp = maximumDate ? Date.parse(maximumDate) : Number.POSITIVE_INFINITY;
  return Object.fromEntries(Object.entries(scoresByPlayer).map(([playerId, scores]) => {
    const latestScores = new Map<string, Score>();
    for (const score of scores) {
      const timestamp = Date.parse(score.timeSet);
      if (!Number.isFinite(timestamp) || timestamp > maximumTimestamp) {
        continue;
      }

      const key = `${score.songHash}\u0000${score.leaderboardId}`;
      const current = latestScores.get(key);
      if (!current || timestamp > Date.parse(current.timeSet)) {
        latestScores.set(key, score);
      }
    }
    return [playerId, [...latestScores.values()]];
  }));
}

@Component({
  selector: 'app-score-scatter-plot',
  imports: [DatePipe, DecimalPipe, MatButton, MatIconButton, MatIcon],
  templateUrl: './score-scatter-plot.html',
  styleUrl: './score-scatter-plot.scss'
})
export class ScoreScatterPlot implements OnChanges, AfterViewInit, OnDestroy {
  @Input() playerScores: Record<string, Score[]> = {};
  @Input() playerNames: Record<string, string> = {};
  @Input() maximumDate?: string;
  @Input() compact = false;
  @Input() selectionEnabled = false;
  readonly selectedSongs = signal<{key: string; score: Score; color: string}[]>([]);
  readonly exportError = signal('');
  private readonly selectionByKey = computed(() => new Map(this.selectedSongs().map(item => [item.key, item])));
  private nextColorIndex = 0;
  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  tooltip = viewChild.required<ElementRef<HTMLDivElement>>('tooltip');
  private chart?: Chart<'scatter'>;
  private viewInitialized = false;

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.viewInitialized && (changes['playerScores'] || changes['playerNames'] || changes['maximumDate']
      || changes['compact'] || changes['selectionEnabled'])) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  get canSelect(): boolean {
    return this.selectionEnabled && !this.compact && Object.keys(this.playerScores).length === 1;
  }

  toggleScore(playerId: string, score: Score): void {
    if (!this.canSelect) {
      return;
    }
    const key = this.selectionKey(playerId, score);
    if (this.selectionByKey().has(key)) {
      this.removeSelection(key);
      return;
    }
    const color = `hsl(${(25 + this.nextColorIndex++ * 137.508) % 360} 75% 45%)`;
    this.selectedSongs.update(items => [...items, {key, score, color}]);
    this.exportError.set('');
    this.chart?.update('none');
  }

  removeSelection(key: string): void {
    this.selectedSongs.update(items => items.filter(item => item.key !== key));
    this.exportError.set('');
    this.chart?.update('none');
  }

  exportPlaylist(): void {
    this.exportError.set('');
    try {
      if (!this.canSelect) {
        throw new Error('Playlist export is only available in single-player view.');
      }
      const playerId = Object.keys(this.playerScores)[0];
      const playlist = buildBeatSaberPlaylist(this.selectedSongs().map(item => item.score), this.playerNames[playerId] ?? 'StatsApp');
      const url = URL.createObjectURL(new Blob([JSON.stringify(playlist, null, 2)], {type: 'application/json'}));
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = 'statsapp-selection.bplist';
        document.body.append(link);
        try {
          link.click();
        } finally {
          link.remove();
        }
      } finally {
        setTimeout(() => URL.revokeObjectURL(url), 0);
      }
    } catch (error) {
      this.exportError.set(error instanceof Error ? error.message : 'Could not export the Beat Saber playlist.');
    }
  }

  private selectionKey(playerId: string, score: Score): string {
    return `${playerId}\u0000${score.songHash}\u0000${score.leaderboardId}`;
  }

  private renderChart(): void {
    this.chart?.destroy();
    const entries = Object.entries(selectLatestScoresBySongAndLeaderboard(this.playerScores, this.maximumDate));
    const available = new Map(entries.flatMap(([playerId, scores]) =>
      scores.map(score => [this.selectionKey(playerId, score), score] as const)));
    this.selectedSongs.update(items => this.canSelect
      ? items.flatMap(item => {
        const score = available.get(item.key);
        return score ? [{...item, score}] : [];
      }) : []);
    this.exportError.set('');
    this.tooltip().nativeElement.style.opacity = '0';
    this.chart = new Chart<'scatter'>(this.canvas().nativeElement, {
      type: 'scatter',
      data: {
        datasets: entries.map<ChartDataset<'scatter'>>(([playerId, scores], index) => {
          const color = DEFAULT_DATASET_COLORS[index % DEFAULT_DATASET_COLORS.length];
          return {
            label: this.playerNames[playerId] ?? playerId,
            data: scores.map(score => ({x: score.stars, y: score.accuracy})),
            backgroundColor: context => {
              const score = scores[context.dataIndex];
              return (score && this.selectionByKey().get(this.selectionKey(playerId, score))?.color)
                || `rgb(${color} / ${this.compact ? '0.2' : '0.85'})`;
            },
            borderColor: context => {
              const score = scores[context.dataIndex];
              return (score && this.selectionByKey().get(this.selectionKey(playerId, score))?.color)
                || `rgb(${color} / 0.85)`;
            },
            pointRadius: context => {
              const score = scores[context.dataIndex];
              return score && this.selectionByKey().has(this.selectionKey(playerId, score)) ? 6 : 2;
            },
            pointHoverRadius: context => {
              const score = scores[context.dataIndex];
              return score && this.selectionByKey().has(this.selectionKey(playerId, score)) ? 7 : 4;
            },
          };
        })
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        onClick: (_event, elements) => {
          const item = elements[0];
          if (item) {
            const score = this.scoreAt(entries, item.datasetIndex, item.index);
            if (score) {
              this.toggleScore(entries[item.datasetIndex][0], score);
            }
          }
        },
        interaction: {mode: 'nearest', intersect: true},
        plugins: {
          tooltip: {
            enabled: false,
            external: context => this.updateExternalTooltip(context, entries),
            callbacks: {
              title: items => {
                const score = this.scoreAt(entries, items[0]?.datasetIndex ?? 0, items[0]?.dataIndex ?? 0);
                return score?.songName ?? '';
              },
              label: item => {
                const score = this.scoreAt(entries, item.datasetIndex, item.dataIndex);
                return score ? `${score.accuracy.toFixed(2)}% | ${score.stars.toFixed(2)} stars` : '';
              },
              afterLabel: item => {
                const score = this.scoreAt(entries, item.datasetIndex, item.dataIndex);
                return score ? `${score.levelAuthorName} | ${new Date(score.timeSet).toLocaleDateString()}` : '';
              }
            }
          }
        },
        scales: {
          x: {title: {display: true, text: 'Stars'}},
          y: {title: {display: true, text: 'Accuracy (%)'}, min: 0, max: 100}
        }
      }
    });
  }

  private updateExternalTooltip(
    context: {chart: Chart; tooltip: TooltipModel<'scatter'>},
    entries: [string, Score[]][]
  ): void {
    if (this.compact) {
      return;
    }

    const {chart, tooltip} = context;
    const tooltipElement = this.tooltip().nativeElement;

    if (tooltip.opacity === 0) {
      tooltipElement.style.opacity = '0';
      return;
    }

    const item = tooltip.dataPoints?.[0];
    const score = item ? this.scoreAt(entries, item.datasetIndex, item.dataIndex) : undefined;
    if (!score) {
      tooltipElement.style.opacity = '0';
      return;
    }

    tooltipElement.replaceChildren();
    const cover = document.createElement('img');
    cover.src = `https://cdn.scoresaber.com/covers/${score.songHash}.png`;
    cover.alt = '';
    cover.style.width = '88px';
    cover.style.height = '88px';
    cover.style.flex = '0 0 88px';
    cover.style.objectFit = 'cover';
    const details = document.createElement('div');
    details.style.display = 'grid';
    details.style.gap = '3px';
    details.style.minWidth = '0';
    const title = document.createElement('strong');
    title.textContent = score.songName;
    title.style.overflow = 'hidden';
    title.style.textOverflow = 'ellipsis';
    title.style.whiteSpace = 'nowrap';
    const stats = document.createElement('span');
    stats.textContent = `${score.accuracy.toFixed(2)}% | ${score.stars.toFixed(2)} stars`;
    stats.style.overflow = 'hidden';
    stats.style.textOverflow = 'ellipsis';
    stats.style.whiteSpace = 'nowrap';
    const metadata = document.createElement('span');
    metadata.textContent = `${score.levelAuthorName} | ${new Date(score.timeSet).toLocaleDateString()}`;
    if (score.difficulty) {
      metadata.textContent += ` | ${score.difficulty.characteristic} / ${score.difficulty.name}`;
    }
    metadata.style.overflow = 'hidden';
    metadata.style.textOverflow = 'ellipsis';
    metadata.style.whiteSpace = 'nowrap';
    details.append(title, stats, metadata);
    tooltipElement.append(cover, details);

    const parent = chart.canvas.parentElement;
    const left = Math.min(tooltip.caretX + 12, (parent?.clientWidth ?? tooltip.caretX) - 240);
    const top = Math.max(tooltip.caretY - 32, 8);
    tooltipElement.style.left = `${Math.max(left, 8)}px`;
    tooltipElement.style.top = `${top}px`;
    tooltipElement.style.opacity = '1';
  }

  private scoreAt(entries: [string, Score[]][], datasetIndex: number, dataIndex: number): Score | undefined {
    const scores = entries[datasetIndex]?.[1] ?? [];
    return scores[dataIndex];
  }
}
