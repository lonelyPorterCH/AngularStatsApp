import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, viewChild} from '@angular/core';
import {Chart, ChartDataset, registerables, TooltipItem} from 'chart.js';
import 'chartjs-adapter-luxon';
import {DateTime} from 'luxon';
import {DataPoint, Stat} from '../models/stat';
import {compareDataPoints, isLinearXAxis, parseXAxisValue} from '../models/x-axis';
import {DEFAULT_DATASET_COLORS} from '../models/dataset-colors';
import {formatPace, parseYAxisValue} from '../models/y-axis';

Chart.register(...registerables);

type ChartCoordinate = {x: string | number; y: number | null};

export interface ChartPointClickEvent {
  datasetLabel: string;
  point: DataPoint;
}

export function chartDataPoints(points: DataPoint[], stat: Stat, smoothing: boolean = false): {x: string | number; y: number}[] {
  const sorted = [...points].sort((first, second) => compareDataPoints(first, second, stat));
  const values = sorted.map(point => parseYAxisValue(point.y, stat));
  return sorted.map((point, index) => {
    const window = values.slice(Math.max(0, index - 6), index + 1).filter(Number.isFinite);
    const value = stat.chartType !== 'bar' && smoothing && Number.isFinite(values[index])
      ? window.reduce((total, measurement) => total + measurement, 0) / window.length
      : values[index];
    return {x: parseXAxisValue(point.x, stat), y: value};
  });
}

export function effortTrendPoints(points: DataPoint[], stat: Stat): {x: string | number; y: number}[] {
  const raw = chartDataPoints(points, stat, false);
  return raw.map((point, index) => {
    const window = raw.slice(Math.max(0, index - 3), index + 4)
      .map(value => value.y).filter(Number.isFinite);
    return {...point, y: Number.isFinite(point.y)
      ? window.reduce((sum, value) => sum + value, 0) / window.length : NaN};
  });
}

@Component({
  selector: 'app-chart',
  template: '<canvas #canvas></canvas>',
  styleUrl: './chart.css'
})
export class ChartComponent implements OnChanges, AfterViewInit, OnDestroy {

  @Input() stat!: Stat;
  @Output() pointClick = new EventEmitter<ChartPointClickEvent>();
  canvas = viewChild.required<ElementRef>('canvas');
  private chart?: Chart<'line' | 'bar', ChartCoordinate[]>;
  private viewInitialized = false;

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.buildChart();
  }

  ngOnChanges(): void {
    if (this.viewInitialized) {
      this.buildChart();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private buildChart(): void {
    if (!this.stat) {
      return;
    }
    this.chart?.destroy();
    const bar = this.stat.chartType === 'bar';
    const comparison = !bar && !!this.stat.effortComparison;
    const pace = this.stat.yAxisFormat === 'pace';
    const linearXAxis = isLinearXAxis(this.stat);
    const stacked = !comparison && !!this.stat.stacked && this.stat.datasets.length >= 2;
    const sortedPoints = this.stat.datasets.map(dataset =>
      [...dataset.dataPoints].sort((first, second) => compareDataPoints(first, second, this.stat)));
    const xValues = [...new Set(sortedPoints.flat().map(point => parseXAxisValue(point.x, this.stat)))]
      .sort((first, second) => compareDataPoints({x: String(first), y: ''}, {x: String(second), y: ''}, this.stat));
    const sourcePoints = bar ? sortedPoints.map(points => {
      const byX = new Map(points.map(point => [parseXAxisValue(point.x, this.stat), point]));
      return xValues.map(x => byX.get(x));
    }) : sortedPoints;
    const coordinates = bar ? [...new Set(xValues.map(value => linearXAxis
      ? Number(value) : DateTime.fromISO(String(value)).toMillis()).filter(Number.isFinite))]
      .sort((first, second) => first - second) : [];
    const minimumGap = coordinates.slice(1).reduce((gap, value, index) =>
      Math.min(gap, value - coordinates[index]), Infinity);
    const padding = (Number.isFinite(minimumGap) ? minimumGap : linearXAxis ? 1 : 86_400_000) / 2;
    const barBounds = coordinates.length ? {
      suggestedMin: coordinates[0] - padding,
      suggestedMax: coordinates[coordinates.length - 1] + padding
    } : {};
    const xAxisUnit = linearXAxis ? this.stat.xAxisUnit?.trim() ?? '' : '';
    const xAxisTitle = xAxisUnit ? `${this.stat.xAxisName} (${xAxisUnit})` : this.stat.xAxisName;
    const colors = this.stat.datasets.map((ds, i) => ds.color || DEFAULT_DATASET_COLORS[i % DEFAULT_DATASET_COLORS.length]);
    const datasets: ChartDataset<'line' | 'bar', ChartCoordinate[]>[] = this.stat.datasets.map((ds, i) => {
      const color = colors[i];
      const smoothing = !bar && !comparison && !!ds.smoothing;
      return {
        label: ds.label,
        data: (bar ? sourcePoints[i].map((point, index) => ({
          x: xValues[index], y: point ? parseYAxisValue(point.y, this.stat) : null
        })) : chartDataPoints(ds.dataPoints, this.stat, smoothing)),
        ...(!bar ? {
          showLine: !comparison,
          fill: !comparison && ds.filled ? (stacked && i > 0 ? '-1' : 'origin') : false,
          tension: 0,
          cubicInterpolationMode: smoothing ? 'monotone' as const : 'default' as const,
          pointRadius: smoothing ? 0 : 2,
          pointHoverRadius: smoothing ? 0 : 4,
          pointHitRadius: smoothing ? 6 : 1,
          pointBackgroundColor: `rgb(${color} / 0.2)`,
        } : {}),
        borderWidth: 1,
        borderColor: `rgb(${color} / 0.85)`,
        backgroundColor: `rgb(${color} / ${bar ? 0.85 : 0.2})`,
      };
    });
    if (comparison) {
      datasets.push(...this.stat.datasets.map((ds, i): ChartDataset<'line' | 'bar', ChartCoordinate[]> => ({
        label: `${ds.label} - trend`,
        data: effortTrendPoints(ds.dataPoints, this.stat),
        borderColor: `rgb(${colors[i]} / 0.85)`,
        backgroundColor: `rgb(${colors[i]} / 0.2)`,
        borderWidth: 2,
        showLine: true,
        fill: false,
        cubicInterpolationMode: 'monotone',
        pointRadius: 0,
        pointHoverRadius: 0,
        pointHitRadius: 0,
        order: 1,
      })));
    }
    this.chart = new Chart<'line' | 'bar', ChartCoordinate[]>(this.canvas().nativeElement, {
      type: bar ? 'bar' : 'line',
      data: {
        datasets
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          ...(comparison ? {
            legend: {
              labels: {filter: (item: {datasetIndex?: number}) => (item.datasetIndex ?? 0) < this.stat.datasets.length},
              onClick: (_event: unknown, item: {datasetIndex?: number},
                legend: {chart: {
                  isDatasetVisible(index: number): boolean;
                  setDatasetVisibility(index: number, visible: boolean): void;
                  update(): void;
                }}) => {
                if (item.datasetIndex === undefined) return;
                const visible = !legend.chart.isDatasetVisible(item.datasetIndex);
                legend.chart.setDatasetVisibility(item.datasetIndex, visible);
                legend.chart.setDatasetVisibility(item.datasetIndex + this.stat.datasets.length, visible);
                legend.chart.update();
              }
            }
          } : {}),
          tooltip: {
            ...(comparison ? {
              filter: (item: TooltipItem<'line' | 'bar'>) => item.datasetIndex < this.stat.datasets.length
            } : {}),
            ...(stacked ? {
              mode: bar ? 'index' as const : 'nearest' as const,
              axis: 'x' as const,
              intersect: false,
              filter: (item: TooltipItem<'line' | 'bar'>, _index: number, items: TooltipItem<'line' | 'bar'>[]) =>
                item.parsed.x === items[0]?.parsed.x
            } : {}),
            callbacks: {
              ...(stacked ? {
                footer: (items: {parsed: {y: number | null}}[]) =>
                  `Total: ${pace ? formatPace(items.reduce((total, item) => total + (item.parsed.y ?? 0), 0))
                    : items.reduce((total, item) => total + (item.parsed.y ?? 0), 0)}`
              } : {}),
              ...(pace ? {
                label: (item: TooltipItem<'line' | 'bar'>) =>
                  `${item.dataset.label}: ${item.parsed.y === null ? '' : formatPace(item.parsed.y)} /km`
              } : {}),
              ...(linearXAxis ? {
                title: (items: {parsed: {x: number | null}}[]) => `${items[0]?.parsed.x ?? ''}${xAxisUnit ? ` ${xAxisUnit}` : ''}`
              } : {}),
              afterLabel: item => {
                const dataset = this.stat.datasets[item.datasetIndex];
                if (!dataset?.smoothing) return '';
                const sorted = [...dataset.dataPoints].sort((first, second) => compareDataPoints(first, second, this.stat));
                const recorded = sorted[item.dataIndex].y;
                return `Recorded: ${pace ? `${formatPace(parseYAxisValue(recorded, this.stat))} /km` : recorded}`;
              }
            }
          }
        },
        onClick: (_event, elements) => {
          if (elements.length > 0) {
            const el = elements.find(element => element.datasetIndex < this.stat.datasets.length);
            if (!el) return;
            const ds = this.stat.datasets[el.datasetIndex];
            const point = sourcePoints[el.datasetIndex]?.[el.index];
            if (ds && point) {
              this.pointClick.emit({datasetLabel: ds.label, point});
            }
          }
        },
        scales: {
          x: {
            type: linearXAxis ? 'linear' : 'time',
            ...(bar ? {stacked, offset: true, ...barBounds} : {}),
            ticks: {
              maxTicksLimit: 6,
              ...(linearXAxis ? {callback: value => `${value}${xAxisUnit ? ` ${xAxisUnit}` : ''}`} : {})
            },
            ...(linearXAxis ? {} : {time: {tooltipFormat: 'DD'}}),
            title: {display: true, text: xAxisTitle}
          },
          y: {
            beginAtZero: false,
            min: this.stat.yAxisMin ?? undefined,
            max: this.stat.yAxisMax ?? undefined,
            stacked: bar ? stacked : stacked ? 'single' : false,
            reverse: this.stat.reverse,
            ...(pace ? {ticks: {callback: (value: string | number) => `${formatPace(Number(value))} /km`}} : {}),
            title: {display: true, text: pace ? `${this.stat.yAxisName} (min/km)` : this.stat.yAxisName}
          }
        }
      }
    });
  }
}
