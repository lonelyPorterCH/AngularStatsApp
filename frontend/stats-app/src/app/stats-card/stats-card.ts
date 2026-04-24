import {Component, Input} from '@angular/core';
import {MatButton} from "@angular/material/button";
import {Stat} from '../models/stat.model';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-stats-card',
  imports: [
    MatButton,
    RouterLink
  ],
  templateUrl: './stats-card.html',
  styleUrl: './stats-card.css',
})
export class StatsCard {
  @Input() stat?: Stat;
}
