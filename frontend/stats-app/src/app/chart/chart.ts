import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, Output, viewChild} from '@angular/core';
import {Chart, registerables} from 'chart.js';
import 'chartjs-adapter-luxon';
import {DataPoint, Stat} from '../models/stat';

Chart.register(...registerables);

export interface ChartPointClickEvent {
  datasetLabel: string;
  point: DataPoint;
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

  private readonly COLORS = [
    {border: 'rgb(0 119 255 / 0.85)', background: 'rgb(0 119 255 / 0.2)'},
    {border: 'rgb(255 99 132 / 0.85)', background: 'rgb(255 99 132 / 0.2)'},
    {border: 'rgb(75 192 192 / 0.85)', background: 'rgb(75 192 192 / 0.2)'},
    {border: 'rgb(255 205 86 / 0.85)', background: 'rgb(255 205 86 / 0.2)'},
    {border: 'rgb(153 102 255 / 0.85)', background: 'rgb(153 102 255 / 0.2)'},
    {border: 'rgb(255 159 64 / 0.85)', background: 'rgb(255 159 64 / 0.2)'},
  ];

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
    this.chart?.destroy();
    this.chart = new Chart(this.canvas().nativeElement, {
      type: 'line',
      data: {
        datasets: this.stat.datasets.map((ds, i) => {
          //Use Dataset Color if present, use predefined color if not
          const color = ds.color ? {
            border: `rgb(${ds.color} / 0.85)`,
            background: `rgb(${ds.color} / 0.2)`
          } : this.COLORS[i % this.COLORS.length];
          return {
            label: ds.label,
            data: ds.dataPoints.map(dp => ({
              x: dp.x as any,
              y: parseFloat(dp.y)
            })),
            fill: ds.filled ?? false,
            tension: 0,
            borderWidth: 1,
            pointRadius: 2,
            borderColor: color.border,
            backgroundColor: color.background,
          };
        })
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        onClick: (_event, elements) => {
          if (elements.length > 0) {
            const el = elements[0];
            const ds = this.stat.datasets[el.datasetIndex];
            const sorted = [...ds.dataPoints].sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());
            const point = sorted[el.index];
            if (ds && point) {
              this.pointClick.emit({datasetLabel: ds.label, point});
            }
          }
        },
        scales: {
          x: {
            type: 'time',
            ticks: {maxTicksLimit: 6},
            time: {tooltipFormat: 'DD'},
            title: {display: true, text: this.stat.xAxisName}
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
