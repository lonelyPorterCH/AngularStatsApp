import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, viewChild} from '@angular/core';
import {Chart, registerables, TooltipItem} from 'chart.js';
import 'chartjs-adapter-luxon';
import {DateTime} from 'luxon';
import {DataPoint, Stat} from '../models/stat';
import {compareDataPoints, isLinearXAxis, parseXAxisValue} from '../models/x-axis';
import {DEFAULT_DATASET_COLORS} from '../models/dataset-colors';

Chart.register(...registerables);

export interface ChartPointClickEvent {
  datasetLabel: string;
  point: DataPoint;
}

export function chartDataPoints(points: DataPoint[], stat: Stat): {x: string | number; y: number}[] {
  const sorted = [...points].sort((first, second) => compareDataPoints(first, second, stat));
  const values = sorted.map(point => parseFloat(point.y));
  return sorted.map((point, index) => {
    const window = values.slice(Math.max(0, index - 6), index + 1).filter(Number.isFinite);
    const value = stat.chartType !== 'bar' && stat.smoothing && Number.isFinite(values[index])
      ? window.reduce((total, measurement) => total + measurement, 0) / window.length
      : values[index];
    return {x: parseXAxisValue(point.x, stat), y: value};
  });
}

@Component({
  selector: 'app-chart',
  template: '<canvas #canvas></canvas>',
  styleUrl: './chart.css'
})
export class ChartComponent implements OnChanges, AfterViewInit {

  @Input() stat!: Stat;
  @Output() pointClick = new EventEmitter<ChartPointClickEvent>();
  canvas = viewChild.required<ElementRef>('canvas');
  private chart?: Chart;
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

  private buildChart(): void {
    if (!this.stat) {
      return;
    }
    this.chart?.destroy();
    const bar = this.stat.chartType === 'bar';
    const smoothing = !bar && !!this.stat.smoothing;
    const linearXAxis = isLinearXAxis(this.stat);
    const stacked = !!this.stat.stacked && this.stat.datasets.length >= 2;
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
    this.chart = new Chart(this.canvas().nativeElement, {
      type: bar ? 'bar' : 'line',
      data: {
        datasets: this.stat.datasets.map((ds, i) => {
          //Use Dataset Color if present, use predefined color if not
          const color = ds.color ? {
            border: `rgb(${ds.color} / 0.85)`,
            background: `rgb(${ds.color} / 0.2)`
          } : {
            border: `rgb(${DEFAULT_DATASET_COLORS[i % DEFAULT_DATASET_COLORS.length]} / 0.85)`,
            background: `rgb(${DEFAULT_DATASET_COLORS[i % DEFAULT_DATASET_COLORS.length]} / 0.2)`
          };
          return {
            label: ds.label,
            data: (bar ? sourcePoints[i].map((point, index) => ({
              x: xValues[index], y: point ? parseFloat(point.y) : null
            })) : chartDataPoints(ds.dataPoints, this.stat)) as any,
            ...(!bar ? {
              fill: ds.filled ? (stacked && i > 0 ? '-1' : 'origin') : false,
              tension: 0,
              cubicInterpolationMode: smoothing ? 'monotone' as const : 'default' as const,
              pointRadius: smoothing ? 0 : 2,
              pointHoverRadius: smoothing ? 0 : 4,
              pointHitRadius: smoothing ? 6 : 1,
            } : {}),
            borderWidth: 1,
            borderColor: color.border,
            backgroundColor: bar ? color.border : color.background,
          };
        })
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
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
                  `Total: ${items.reduce((total, item) => total + (item.parsed.y ?? 0), 0)}`
              } : {}),
              ...(linearXAxis ? {
                title: (items: {parsed: {x: number | null}}[]) => `${items[0]?.parsed.x ?? ''}${xAxisUnit ? ` ${xAxisUnit}` : ''}`
              } : {}),
              afterLabel: item => {
                if (!smoothing) return '';
                const dataset = this.stat.datasets[item.datasetIndex];
                const sorted = [...dataset.dataPoints].sort((first, second) => compareDataPoints(first, second, this.stat));
                return `Recorded: ${sorted[item.dataIndex].y}`;
              }
            }
          }
        },
        onClick: (_event, elements) => {
          if (elements.length > 0) {
            const el = elements[0];
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
            beginAtZero: this.stat.includeZero ?? false,
            stacked: bar ? stacked : stacked ? 'single' : false,
            reverse: this.stat.reverse,
            title: {display: true, text: this.stat.yAxisName}
          }
        }
      }
    });
  }
}
