import {AfterViewInit, Component, ElementRef, Input, OnChanges, viewChild} from '@angular/core';
import {Chart, registerables} from 'chart.js';
import {HarvestPlantTotal} from '../models/harvest';

Chart.register(...registerables);

@Component({
  selector: 'app-harvest-donut-chart',
  template: '<canvas #canvas></canvas>',
  styleUrl: './harvest-donut-chart.scss'
})
export class HarvestDonutChart implements OnChanges, AfterViewInit {
  @Input() totals: HarvestPlantTotal[] = [];
  @Input() compact = false;
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
      type: 'doughnut',
      data: {
        labels: this.totals.map(total => total.plantName),
        datasets: [{
          data: this.totals.map(total => total.totalQuantity),
          backgroundColor: ['#2f6f57', '#d98c3f', '#b94f45', '#557da6', '#8d6a9c', '#6f8c5c'],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: this.compact ? '62%' : '55%',
        plugins: {
          legend: {position: this.compact ? 'bottom' : 'right'}
        }
      }
    });
  }
}
