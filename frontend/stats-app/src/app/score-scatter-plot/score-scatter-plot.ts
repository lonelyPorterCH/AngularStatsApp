import {AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, SimpleChanges, viewChild} from '@angular/core';
import {Chart, registerables, TooltipModel} from 'chart.js';
import 'chartjs-adapter-luxon';
import {Score} from '../models/score';
import {DEFAULT_DATASET_COLORS} from '../models/dataset-colors';

Chart.register(...registerables);

@Component({
  selector: 'app-score-scatter-plot',
  template: '<div class="score-chart"><canvas #canvas></canvas><div #tooltip class="score-tooltip"></div></div>',
  styleUrl: './score-scatter-plot.scss'
})
export class ScoreScatterPlot implements OnChanges, AfterViewInit, OnDestroy {
  @Input() playerScores: Record<string, Score[]> = {};
  @Input() playerNames: Record<string, string> = {};
  @Input() maximumDate?: string;
  @Input() compact = false;
  canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  tooltip = viewChild.required<ElementRef<HTMLDivElement>>('tooltip');
  private chart?: Chart;
  private viewInitialized = false;

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.renderChart();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (this.viewInitialized && (changes['playerScores'] || changes['playerNames'] || changes['maximumDate'] || changes['compact'])) {
      this.renderChart();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private renderChart(): void {
    this.chart?.destroy();
    const entries = Object.entries(this.playerScores);
    this.chart = new Chart(this.canvas().nativeElement, {
      type: 'scatter',
      data: {
        datasets: entries.map(([playerId, scores], index) => {
          const color = DEFAULT_DATASET_COLORS[index % DEFAULT_DATASET_COLORS.length];
          return {
            label: this.playerNames[playerId] ?? playerId,
            data: scores
              .filter(score => !this.maximumDate || score.timeSet <= this.maximumDate)
              .map(score => ({x: score.stars, y: score.accuracy})),
            backgroundColor: `rgb(${color} / ${this.compact ? '0.2' : '0.85'})`,
            borderColor: `rgb(${color} / 0.85)`,
            pointRadius: 2,
            pointHoverRadius: 4,
          };
        })
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
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
    const filteredScores = scores.filter(score => !this.maximumDate || score.timeSet <= this.maximumDate);
    return filteredScores[dataIndex];
  }
}
