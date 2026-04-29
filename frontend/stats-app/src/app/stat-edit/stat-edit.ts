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
import {MatDatepicker, MatDatepickerInput, MatDatepickerToggle} from '@angular/material/datepicker';
import {MatTab, MatTabGroup} from '@angular/material/tabs';
import {MatOption, MatSelect} from '@angular/material/select';
import {ConfirmDialog} from '../confirm-dialog/confirm-dialog';
import {MatDialog} from '@angular/material/dialog';
import {DatePipe} from '@angular/common';

@Component({
  selector: 'app-stat-edit',
  imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, ReactiveFormsModule, ChartComponent, MatDatepickerInput, MatDatepickerToggle, MatDatepicker, MatTabGroup, MatTab, MatSelect, MatOption, DatePipe],
  templateUrl: './stat-edit.html',
  styleUrl: './stat-edit.css'
})
export class StatEdit implements OnInit {

  stat = signal<Stat | undefined>(undefined);
  addPointForm!: FormGroup;
  increaseForm!: FormGroup;
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

    this.addPointForm = this.formBuilder.group({
      x: ['', Validators.required],
      y: ['', Validators.required]
    }, {updateOn: 'blur'});

    this.increaseForm = this.formBuilder.group({
      x: ['', Validators.required],
      amount: ['', Validators.required]
    }, {updateOn: 'blur'});

    this.editPointForm = this.formBuilder.group({
      selectedPoint: [null, Validators.required],
      value: ['']
    }, {updateOn: 'blur'});
  }

  onAddPoint(): void {
    if (this.addPointForm.invalid || !this.stat()) return;

    const newPoint: DataPoint = {
      x: this.addPointForm.get('x')?.value,
      y: this.addPointForm.get('y')?.value
    };

    this.statService.addDataPoint(this.stat()!.id, newPoint).subscribe({
      next: () => {
        // reload the stat so the chart updates
        this.statService.getStatById(this.stat()!.id).subscribe({
          next: data => {
            this.stat.set(data);
            this.addPointForm.reset();
          }
        });
      },
      error: err => console.error(err)
    });
  }

  onIncrease(): void {
    if (this.increaseForm.invalid || !this.stat()) return;

    const latestPoint = this.stat()!.dataPoints
      .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime())
      .at(-1);

    if (!latestPoint) return;

    const newValue = parseFloat(latestPoint.y) + parseFloat(this.increaseForm.get('amount')?.value);

    const newPoint: DataPoint = {
      x: this.increaseForm.get('x')?.value,
      y: newValue.toString()
    };

    this.statService.addDataPoint(this.stat()!.id, newPoint).subscribe({
      next: () => {
        this.statService.getStatById(this.stat()!.id).subscribe({
          next: data => {
            this.stat.set(data);
            this.increaseForm.reset();
          }
        });
      },
      error: err => console.error(err)
    });
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

  private reloadStat(): void {
    this.statService.getStatById(this.stat()!.id).subscribe({
      next: data => {
        this.stat.set(data);
        this.editPointForm.reset();
      }
    });
  }
}
