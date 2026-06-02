import {Component, computed, EventEmitter, Input, OnChanges, OnInit, Output, signal, SimpleChanges} from '@angular/core';
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
export class EditDeleteForm implements OnInit, OnChanges {

  @Input() stat!: Stat;
  @Output() pointChanged = new EventEmitter<void>();
  editPointForm!: FormGroup;

  selectedDatasetLabel = signal<string | null>(null);

  sortedDataPoints = computed(() => {
    const label = this.selectedDatasetLabel();
    if (!this.stat || !label) return [];
    const ds = this.stat.datasets.find(d => d.label === label);
    if (!ds) return [];
    return [...ds.dataPoints]
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
      dataset: [null, Validators.required],
      selectedPoint: [null, Validators.required],
      value: ['']
    }, {updateOn: 'blur'});

    this.editPointForm.get('dataset')?.valueChanges.subscribe(label => {
      this.selectedDatasetLabel.set(label);
      this.editPointForm.get('selectedPoint')?.reset();
      this.editPointForm.get('value')?.reset();
    });

    this.preselectDatasetIfSingle();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stat']) {
      this.preselectDatasetIfSingle();
    }
  }

  prefillPoint(datasetLabel: string, point: DataPoint): void {
    this.editPointForm.patchValue({dataset: datasetLabel});
    this.selectedDatasetLabel.set(datasetLabel);

    const sorted = this.sortedDataPoints();
    const match = sorted.find(p => p.x === point.x && p.y === point.y);
    if (match) {
      this.editPointForm.patchValue({selectedPoint: match, value: match.y});
    }
  }

  onPointSelected(event: any): void {
    this.editPointForm.get('value')?.setValue(event.value.y);
  }

  onEditPoint(): void {
    if (this.editPointForm.get('selectedPoint')?.invalid || !this.stat) return;

    const datasetLabel: string = this.editPointForm.get('dataset')?.value;
    const selected: DataPoint = this.editPointForm.get('selectedPoint')?.value;
    const newValue = this.editPointForm.get('value')?.value;

    if (!newValue) {
      const dialogRef = this.dialog.open(ConfirmDialog);
      dialogRef.afterClosed().subscribe(confirmed => {
        if (confirmed) {
          this.deletePoint(datasetLabel, selected);
        }
      });
    } else {
      this.replacePoint(datasetLabel, selected, newValue);
    }
  }

  private deletePoint(datasetLabel: string, point: DataPoint): void {
    this.statService.deleteDataPoint(this.stat!.id, datasetLabel, point).subscribe({
      next: () => {
        this.pointChanged.emit();
        this.editPointForm.reset();
        this.selectedDatasetLabel.set(null);
        this.preselectDatasetIfSingle();
      },
      error: err => console.error(err)
    });
  }

  private replacePoint(datasetLabel: string, oldPoint: DataPoint, newValue: string): void {
    this.statService.deleteDataPoint(this.stat!.id, datasetLabel, oldPoint).subscribe({
      next: () => {
        const newPoint: DataPoint = {x: oldPoint.x, y: newValue};
        this.statService.addDataPoint(this.stat!.id, datasetLabel, newPoint).subscribe({
          next: () => {
            this.pointChanged.emit();
            this.editPointForm.reset();
            this.selectedDatasetLabel.set(null);
            this.preselectDatasetIfSingle();
          },
          error: err => console.error(err)
        });
      },
      error: err => console.error(err)
    });
  }

  private preselectDatasetIfSingle(): void {
    if (!this.editPointForm || !this.stat) return;
    if (this.stat.datasets.length === 1) {
      const label = this.stat.datasets[0].label;
      this.editPointForm.patchValue({dataset: label});
      this.selectedDatasetLabel.set(label);
    }
  }
}
