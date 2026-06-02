import {Component, OnInit, signal, viewChild} from '@angular/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {ReactiveFormsModule} from '@angular/forms';
import {Stat} from '../models/stat';
import {StatService} from '../services/stat-service';
import {ActivatedRoute} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {ChartComponent, ChartPointClickEvent} from '../chart/chart';
import {MatTab, MatTabGroup} from '@angular/material/tabs';
import {AddPointForm} from './add-point-form/add-point-form';
import {IncreaseForm} from './increase-form/increase-form';
import {EditDeleteForm} from './edit-delete-form/edit-delete-form';
import {ManageDatasetsForm} from './manage-datasets-form/manage-datasets-form';

@Component({
  selector: 'app-stat-edit',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, ReactiveFormsModule, ChartComponent, MatTabGroup, MatTab, AddPointForm, IncreaseForm, EditDeleteForm, ManageDatasetsForm],
  templateUrl: './stat-edit.html',
  styleUrl: './stat-edit.css'
})
export class StatEdit implements OnInit {

  stat = signal<Stat | undefined>(undefined);
  tabGroup = viewChild<MatTabGroup>('tabGroup');
  editDeleteForm = viewChild<EditDeleteForm>('editDeleteForm');


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

  protected onChartPointClick(event: ChartPointClickEvent): void {
    const tabGroup = this.tabGroup();
    if (tabGroup) {
      tabGroup.selectedIndex = 3; // "Edit / Delete Point" tab
    }
    setTimeout(() => {
      this.editDeleteForm()?.prefillPoint(event.datasetLabel, event.point);
    });
  }
}
