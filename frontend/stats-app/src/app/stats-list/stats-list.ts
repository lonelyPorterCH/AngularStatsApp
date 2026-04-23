import {Component} from '@angular/core';
import {MatButton} from '@angular/material/button';

@Component({
  selector: 'app-stats-list',
  imports: [
    MatButton
  ],
  templateUrl: './stats-list.html',
  styleUrl: './stats-list.scss',
})
export class StatsList {

  //TODO: temporary, will be replaced with backend call later
  stats = [
    {
      "id": "arc-raiders-trials",
      "title": "ARC Raiders - Trials",
      "reverse": false,
      "xAxisName": "Week",
      "yAxisName": "Score",
      "dataPoints": [{"x": "2026-02-16", "y": "21351"}, {"x": "2026-02-23", "y": "25801"}]
    },
    {
      "id": "pogo-coins-2026",
      "title": "Pokécoins PoGO - 2026",
      "reverse": false,
      "xAxisName": "Coins",
      "yAxisName": "Date",
      "dataPoints": [{"x": "2026-01-01", "y": "4565"}, {"x": "2026-01-02", "y": "4615"}]
    }
  ];
}
