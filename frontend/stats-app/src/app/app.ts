import {Component} from '@angular/core';
import {MatToolbar} from '@angular/material/toolbar';
import {MatIcon} from '@angular/material/icon';
import {RouterOutlet} from '@angular/router';

@Component({
  selector: 'app-root',
  imports: [MatToolbar, MatIcon, RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {
}
