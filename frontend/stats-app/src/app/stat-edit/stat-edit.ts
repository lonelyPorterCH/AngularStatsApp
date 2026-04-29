import {Component, computed, OnInit, signal} from '@angular/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatInputModule} from '@angular/material/input';
import {MatButtonModule} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {DataPoint, Stat} from '../models/stat';
import {StatService} from '../services/stat-service';
import {ActivatedRoute} from '@angular/router';
import {Title} from '@angular/platform-browser';
import {ChartComponent} from '../chart/chart';
import {MatTab, MatTabGroup} from '@angular/material/tabs';
import {MatOption, MatSelect} from '@angular/material/select';
import {ConfirmDialog} from '../confirm-dialog/confirm-dialog';
import {MatDialog} from '@angular/material/dialog';
import {DatePipe} from '@angular/common';
import {AddPointForm} from './add-point-form/add-point-form';
import {IncreaseForm} from './increase-form/increase-form';

@Component({
  selector: 'app-stat-edit',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, ReactiveFormsModule, ChartComponent, MatTabGroup, MatTab, MatSelect, MatOption, DatePipe, AddPointForm, IncreaseForm],
  templateUrl: './stat-edit.html',
  styleUrl: './stat-edit.css'
})
export class StatEdit implements OnInit {

  stat = signal<Stat | undefined>(undefined);
  editPointForm!: FormGroup;

  sortedDataPoints = computed(() => {
    if (!this.stat()) return [];
    return [...this.stat()!.dataPoints]
      .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());
  });

  constructor(
    private statService: StatService,
    private route: ActivatedRoute,
    private formBuilder: FormBuilder,
    private title: Title,
    private dialog: MatDialog,
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

    this.editPointForm = this.formBuilder.group({
      selectedPoint: [null, Validators.required],
      value: ['']
    }, {updateOn: 'blur'});
  }

  onPointSelected(event: any): void {
    this.editPointForm.get('value')?.setValue(event.value.y);
  }

  onEditPoint(): void {
    if (this.editPointForm.get('selectedPoint')?.invalid || !this.stat()) return;

    const selected: DataPoint = this.editPointForm.get('selectedPoint')?.value;
    const newValue = this.editPointForm.get('value')?.value;

    if (!newValue) {
      const dialogRef = this.dialog.open(ConfirmDialog);
      dialogRef.afterClosed().subscribe(confirmed => {
        if (confirmed) {
          this.deletePoint(selected);
        }
      });
    } else {
      this.replacePoint(selected, newValue);
    }
  }

  protected reloadStat(): void {
    this.statService.getStatById(this.stat()!.id).subscribe({
      next: data => {
        this.stat.set(data);
        this.editPointForm.reset();
      }
    });
  }

  private deletePoint(point: DataPoint): void {
    this.statService.deleteDataPoint(this.stat()!.id, point).subscribe({
      next: () => this.reloadStat(),
      error: err => console.error(err)
    });
  }

  private replacePoint(oldPoint: DataPoint, newValue: string): void {
    this.statService.deleteDataPoint(this.stat()!.id, oldPoint).subscribe({
      next: () => {
        const newPoint: DataPoint = {x: oldPoint.x, y: newValue};
        this.statService.addDataPoint(this.stat()!.id, newPoint).subscribe({
          next: () => this.reloadStat(),
          error: err => console.error(err)
        });
      },
      error: err => console.error(err)
    });
  }
}
