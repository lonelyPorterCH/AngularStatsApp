import {Component, OnInit, signal} from '@angular/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {ReactiveFormsModule} from '@angular/forms';
import {Stat} from '../models/stat';
import {StatService} from '../services/stat-service';
import {ActivatedRoute} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {ChartComponent} from '../chart/chart';
import {MatTab, MatTabGroup} from '@angular/material/tabs';
import {AddPointForm} from './add-point-form/add-point-form';
import {IncreaseForm} from './increase-form/increase-form';
import {EditDeleteForm} from './edit-delete-form/edit-delete-form';

@Component({
  selector: 'app-stat-edit',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, ReactiveFormsModule, ChartComponent, MatTabGroup, MatTab, AddPointForm, IncreaseForm, EditDeleteForm],
  templateUrl: './stat-edit.html',
  styleUrl: './stat-edit.css'
})
export class StatEdit implements OnInit {

  stat = signal<Stat | undefined>(undefined);


  constructor(
    private statService: StatService,
    private route: ActivatedRoute,
    private title: Title,
  ) {
  }

  ngOnInit(): void {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.statService.getStatById(id).subscribe({
          next: data => {
            this.stat.set(data);
            this.title.setTitle(`StatsApp - Edit ${data.title}`);
          }
        });
      }
    });
  }

  protected reloadStat(): void {
    this.statService.getStatById(this.stat()!.id).subscribe({
      next: data => {
        this.stat.set(data);
      }
    });
  }
}
