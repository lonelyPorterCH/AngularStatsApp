import {Component, computed, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {DatePipe} from '@angular/common';
import {MatButton} from '@angular/material/button';
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {MatIcon} from '@angular/material/icon';
import {MatOption} from '@angular/material/core';
import {MatSelect} from '@angular/material/select';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {DataPoint, Stat} from '../../models/stat';
import {StatService} from '../../services/stat-service';
import {MatDialog} from '@angular/material/dialog';
import {ConfirmDialog} from '../../confirm-dialog/confirm-dialog';

@Component({
  selector: 'app-edit-delete-form',
  imports: [
    DatePipe,
    MatButton,
    MatFormField,
    MatIcon,
    MatInput,
    MatLabel,
    MatOption,
    MatSelect,
    ReactiveFormsModule
  ],
  templateUrl: './edit-delete-form.html',
  styleUrl: './edit-delete-form.css',
})
export class EditDeleteForm implements OnInit {

  @Input() stat!: Stat;
  @Output() pointChanged = new EventEmitter<void>();
  editPointForm!: FormGroup;
  sortedDataPoints = computed(() => {
    if (!this.stat) return [];
    return [...this.stat!.dataPoints]
      .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime());
  });

  constructor(
    private statService: StatService,
    private formBuilder: FormBuilder,
    private dialog: MatDialog,
  ) {
  }

  ngOnInit(): void {
    this.editPointForm = this.formBuilder.group({
      selectedPoint: [null, Validators.required],
      value: ['']
    }, {updateOn: 'blur'});
  }

  onPointSelected(event: any): void {
    this.editPointForm.get('value')?.setValue(event.value.y);
  }

  onEditPoint(): void {
    if (this.editPointForm.get('selectedPoint')?.invalid || !this.stat) return;

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
    this.statService.deleteDataPoint(this.stat!.id, point).subscribe({
      next: () => {
        this.pointChanged.emit();
        this.editPointForm.reset();
      },
      error: err => console.error(err)
    });
  }

  private replacePoint(oldPoint: DataPoint, newValue: string): void {
    this.statService.deleteDataPoint(this.stat!.id, oldPoint).subscribe({
      next: () => {
        const newPoint: DataPoint = {x: oldPoint.x, y: newValue};
        this.statService.addDataPoint(this.stat!.id, newPoint).subscribe({
          next: () => {
            this.pointChanged.emit();
            this.editPointForm.reset();
          },
          error: err => console.error(err)
        });
      },
      error: err => console.error(err)
    });
  }
}
