import {Component, OnInit, signal} from '@angular/core';
import {DatePipe} from '@angular/common';
import {FormsModule} from '@angular/forms';
import {MatButton} from '@angular/material/button';
import {MatIcon} from '@angular/material/icon';
import {HarvestEntry, HarvestPlant, HarvestView} from '../models/harvest';
import {HarvestService} from '../services/harvest-service';
import {HarvestDonutChart} from '../harvest-donut-chart/harvest-donut-chart';
import {HarvestLineChart} from '../harvest-line-chart/harvest-line-chart';

@Component({
  selector: 'app-harvest-tracker',
  imports: [DatePipe, FormsModule, MatButton, MatIcon, HarvestDonutChart, HarvestLineChart],
  templateUrl: './harvest-tracker.html',
  styleUrl: './harvest-tracker.scss'
})
export class HarvestTracker implements OnInit {
  readonly currentYear = new Date().getFullYear();
  years = signal<number[]>([]);
  view = signal<HarvestView | undefined>(undefined);
  loading = signal(true);
  error = signal('');
  selectedYear = this.currentYear;
  newPlantName = '';
  selectedPlantId = '';
  harvestDates: Record<string, string> = {};
  harvestQuantities: Record<string, number> = {};
  editing: {plantId: string; entry: HarvestEntry} | undefined;
  editingPlants = new Set<string>();

  constructor(private readonly harvestService: HarvestService) {
  }

  ngOnInit(): void {
    this.harvestService.getYears().subscribe({
      next: years => {
        this.years.set([...new Set([this.currentYear, ...years])].sort((a, b) => b - a));
        this.loadSeason();
      },
      error: () => this.loadSeason()
    });
  }

  loadSeason(): void {
    this.loading.set(true);
    this.error.set('');
    this.harvestService.getSeason(this.selectedYear).subscribe({
      next: view => {
        this.view.set(view);
        for (const plant of view.plants) {
          this.harvestDates[plant.id] ??= `${this.selectedYear}-01-01`;
          this.harvestQuantities[plant.id] ??= 1;
        }
        this.selectedPlantId = this.selectedPlantId && view.plants.some(plant => plant.id === this.selectedPlantId)
          ? this.selectedPlantId : view.plants[0]?.id ?? '';
      },
      error: () => this.error.set('Could not load this harvest season.'),
      complete: () => this.loading.set(false)
    });
  }

  onYearChange(): void {
    this.loadSeason();
  }

  addPlant(): void {
    const name = this.newPlantName.trim();
    if (!name) return;
    this.harvestService.addPlant(this.selectedYear, name).subscribe({
      next: () => {
        this.newPlantName = '';
        this.loadSeason();
      },
      error: err => this.error.set(err.status === 409 ? 'A plant with that name already exists.' : 'Could not add the plant.')
    });
  }

  renamePlant(plant: HarvestPlant): void {
    const name = window.prompt('Plant name', plant.name)?.trim();
    if (!name || name === plant.name) return;
    this.harvestService.renamePlant(this.selectedYear, plant.id, name).subscribe({
      next: () => this.loadSeason(),
      error: err => this.error.set(err.status === 409 ? 'A plant with that name already exists.' : 'Could not rename the plant.')
    });
  }

  deletePlant(plant: HarvestPlant): void {
    if (!window.confirm(`Delete ${plant.name} and all its harvest history?`)) return;
    this.harvestService.deletePlant(this.selectedYear, plant.id).subscribe({
      next: () => this.loadSeason(),
      error: () => this.error.set('Could not delete the plant.')
    });
  }

  togglePlantEditing(plantId: string): void {
    if (this.editingPlants.has(plantId)) {
      this.editingPlants.delete(plantId);
      if (this.editing?.plantId === plantId) this.editing = undefined;
    } else {
      this.editingPlants.add(plantId);
    }
  }

  isPlantEditing(plantId: string): boolean {
    return this.editingPlants.has(plantId);
  }

  saveHarvest(plantId = this.selectedPlantId): void {
    const date = this.harvestDates[plantId];
    const quantity = this.harvestQuantities[plantId];
    if (!plantId || !date || quantity < 1) {
      this.error.set('Enter a valid harvest date and a quantity greater than zero.');
      return;
    }
    this.selectedPlantId = plantId;
    const request = this.editing
      ? this.harvestService.updateHarvest(this.selectedYear, this.editing.plantId, this.editing.entry.id, date, quantity)
      : this.harvestService.addHarvest(this.selectedYear, this.selectedPlantId, date, quantity);
    request.subscribe({
      next: () => {
        this.editing = undefined;
        this.harvestQuantities[plantId] = 1;
        this.loadSeason();
      },
      error: () => this.error.set('Could not save the harvest entry.')
    });
  }

  editHarvest(plantId: string, entry: HarvestEntry): void {
    this.editing = {plantId, entry};
    this.selectedPlantId = plantId;
    this.harvestDates[plantId] = entry.date;
    this.harvestQuantities[plantId] = entry.quantity;
  }

  cancelEdit(): void {
    this.editing = undefined;
  }

  deleteHarvest(plantId: string, entry: HarvestEntry): void {
    if (!window.confirm('Delete this harvest entry?')) return;
    this.harvestService.deleteHarvest(this.selectedYear, plantId, entry.id).subscribe({
      next: () => this.loadSeason(),
      error: () => this.error.set('Could not delete the harvest entry.')
    });
  }

}
