import {Component, Input} from '@angular/core';
import {MatButton} from "@angular/material/button";
import {Stat} from '../models/stat';
import {RouterLink} from '@angular/router';
import {ChartComponent} from '../chart/chart';

@Component({
  selector: 'app-stats-card',
  imports: [
    MatButton,
    RouterLink,
    ChartComponent
  ],
  templateUrl: './stats-card.html',
  styleUrl: './stats-card.scss',
})
export class StatsCard {
  @Input() stat?: Stat;
}
