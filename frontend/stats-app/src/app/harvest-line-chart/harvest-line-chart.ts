import {AfterViewInit, Component, ElementRef, Input, OnChanges, viewChild} from '@angular/core';
import {Chart, registerables} from 'chart.js';
import 'chartjs-adapter-luxon';
import {HarvestChartPoint, HarvestSeries} from '../models/harvest';

Chart.register(...registerables);

@Component({
  selector: 'app-harvest-line-chart',
  template: '<canvas #canvas></canvas>',
  styleUrl: './harvest-line-chart.scss'
})
export class HarvestLineChart implements OnChanges, AfterViewInit {
  @Input() series: HarvestSeries[] = [];
  @Input() globalSeries: HarvestChartPoint[] = [];
  @Input() showGlobal = false;
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
    const datasets = this.showGlobal ? [{
      label: 'All plants',
      data: this.globalSeries.map(point => ({x: Date.parse(point.date), y: point.quantity})),
      borderColor: '#2f6f57',
      backgroundColor: 'rgba(47, 111, 87, 0.15)',
      borderWidth: 3,
      pointRadius: 3,
      tension: 0.15
    }] : this.series.map((line, index) => ({
      label: line.plantName,
      data: line.points.map(point => ({x: Date.parse(point.date), y: point.quantity})),
      borderColor: ['#2f6f57', '#d98c3f', '#b94f45', '#557da6', '#8d6a9c'][index % 5],
      backgroundColor: 'transparent',
      borderWidth: 2,
      pointRadius: 2,
      tension: 0.15
    }));

    this.chart = new Chart(this.canvas().nativeElement, {
      type: 'line',
      data: {datasets},
      options: {
        responsive: true,
        maintainAspectRatio: false,
        parsing: false,
        scales: {
          x: {type: 'time', time: {unit: 'day', tooltipFormat: 'dd.MM.yyyy'}, title: {display: true, text: 'Harvest date'}},
          y: {beginAtZero: true, title: {display: true, text: 'Tomatoes harvested'}}
        }
      }
    });
  }
}
