import {Component, Input} from '@angular/core';
import {MatButton} from "@angular/material/button";
import {Stat} from '../models/stat.model';

@Component({
  selector: 'app-stats-card',
  imports: [
    MatButton
  ],
  templateUrl: './stats-card.html',
  styleUrl: './stats-card.css',
})
export class StatsCard {
  @Input() stat?: Stat;
}
