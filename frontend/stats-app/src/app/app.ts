import { Component, signal } from '@angular/core';
import {StatsList} from './stats-list/stats-list';

@Component({
  selector: 'app-root',
  imports: [StatsList],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('stats-app');
}
