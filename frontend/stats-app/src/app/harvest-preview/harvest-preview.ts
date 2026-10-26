import {Component, OnInit, signal} from '@angular/core';
import {RouterLink} from '@angular/router';
import {MatButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {HarvestService} from '../services/harvest-service';
import {HarvestView} from '../models/harvest';
import {HarvestDonutChart} from '../harvest-donut-chart/harvest-donut-chart';

@Component({
  selector: 'app-harvest-preview',
  imports: [RouterLink, MatButton, MatIcon, HarvestDonutChart],
  templateUrl: './harvest-preview.html',
  styleUrl: './harvest-preview.scss'
})
export class HarvestPreview implements OnInit {
  view = signal<HarvestView | undefined>(undefined);
  loading = signal(true);
  year = new Date().getFullYear();

  constructor(private readonly harvestService: HarvestService) {
  }

  ngOnInit(): void {
    this.harvestService.getSeason(this.year).subscribe({
      next: view => this.view.set(view),
      error: () => this.loading.set(false),
      complete: () => this.loading.set(false)
    });
  }
}
