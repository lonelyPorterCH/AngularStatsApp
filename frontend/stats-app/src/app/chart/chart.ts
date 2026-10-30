import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, viewChild} from '@angular/core';
import {Chart, registerables} from 'chart.js';
import 'chartjs-adapter-luxon';
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
    const value = stat.smoothing && Number.isFinite(values[index])
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
    const linearXAxis = isLinearXAxis(this.stat);
    const xAxisUnit = linearXAxis ? this.stat.xAxisUnit?.trim() ?? '' : '';
    const xAxisTitle = xAxisUnit ? `${this.stat.xAxisName} (${xAxisUnit})` : this.stat.xAxisName;
    this.chart = new Chart(this.canvas().nativeElement, {
      type: 'line',
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
            data: chartDataPoints(ds.dataPoints, this.stat) as any,
            fill: ds.filled ?? false,
            tension: 0,
            cubicInterpolationMode: this.stat.smoothing ? 'monotone' as const : 'default' as const,
            borderWidth: 1,
            pointRadius: this.stat.smoothing ? 0 : 2,
            pointHoverRadius: this.stat.smoothing ? 0 : 4,
            pointHitRadius: this.stat.smoothing ? 6 : 1,
            borderColor: color.border,
            backgroundColor: color.background,
          };
        })
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: {
            callbacks: {
              ...(linearXAxis ? {
                title: (items: {parsed: {x: number | null}}[]) => `${items[0]?.parsed.x ?? ''}${xAxisUnit ? ` ${xAxisUnit}` : ''}`
              } : {}),
              afterLabel: item => {
                if (!this.stat.smoothing) return '';
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
            const sorted = [...ds.dataPoints].sort((a, b) => compareDataPoints(a, b, this.stat));
            const point = sorted[el.index];
            if (ds && point) {
              this.pointClick.emit({datasetLabel: ds.label, point});
            }
          }
        },
        scales: {
          x: {
            type: linearXAxis ? 'linear' : 'time',
            ticks: {
              maxTicksLimit: 6,
              ...(linearXAxis ? {callback: value => `${value}${xAxisUnit ? ` ${xAxisUnit}` : ''}`} : {})
            },
            ...(linearXAxis ? {} : {time: {tooltipFormat: 'DD'}}),
            title: {display: true, text: xAxisTitle}
          },
          y: {
            reverse: this.stat.reverse,
            title: {display: true, text: this.stat.yAxisName}
          }
        }
      }
    });
  }
}
