import {AfterViewInit, Component, ElementRef, Input, OnChanges, viewChild} from '@angular/core';
import {Chart, registerables} from 'chart.js';
import 'chartjs-adapter-luxon';
import {Stat} from '../models/stat.model';

Chart.register(...registerables);

@Component({
  selector: 'app-chart',
  template: '<canvas #canvas></canvas>',
  styleUrl: './chart.css'
})
export class ChartComponent implements OnChanges, AfterViewInit {

  @Input() stat!: Stat;
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
    this.chart?.destroy();
    this.chart = new Chart(this.canvas().nativeElement, {
      type: 'line',
      data: {
        datasets: [{
          data: this.stat.dataPoints.map(dp => ({
            x: dp.x as any,
            y: parseFloat(dp.y)
          })),
          label: this.stat.yAxisName,
          fill: false,
          tension: 0,
          borderWidth: 1,
          pointRadius: 2,
          borderColor: 'rgb(0 119 255 / 0.75)',
          backgroundColor: 'rgb(95 139 227 / 0.8)',
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'time',
            ticks: {maxTicksLimit: 6},
            time: {tooltipFormat: 'DD T'},
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
