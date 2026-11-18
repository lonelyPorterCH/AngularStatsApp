import {Component, computed, EventEmitter, Input, OnChanges, OnInit, Output, signal, SimpleChanges} from '@angular/core';
import {DatePipe} from '@angular/common';
import {MatButton} from '@angular/material/button';
import {MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {MatSuffix} from '@angular/material/form-field';
import {MatIcon} from '@angular/material/icon';
import {MatOption} from '@angular/material/core';
import {MatSelect, MatSelectChange} from '@angular/material/select';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {DataPoint, Stat} from '../../models/stat';
import {StatService} from '../../services/stat-service';
import {MatDialog} from '@angular/material/dialog';
import {ConfirmDialog} from '../../confirm-dialog/confirm-dialog';
import {compareDataPoints, isLinearXAxis} from '../../models/x-axis';
import {countToPercentage, formatInputNumber, isPercentageInput, parseYAxisValue, PercentageInputValue} from '../../models/y-axis';

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
    MatSuffix,
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
  submissionError = signal('');
  private readonly entryValue = new PercentageInputValue();

  sortedDataPoints = computed(() => {
    const label = this.selectedDatasetLabel();
    if (!this.stat || !label) return [];
    const ds = this.stat.datasets.find(d => d.label === label);
    if (!ds) return [];
    return [...ds.dataPoints]
      .sort((a, b) => compareDataPoints(a, b, this.stat));
  });

  protected readonly isLinearXAxis = isLinearXAxis;
  protected readonly isPercentageInput = isPercentageInput;

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
    this.editPointForm.get('value')!.valueChanges.subscribe(() => this.entryValue.reset());

    this.editPointForm.get('dataset')?.valueChanges.subscribe(label => {
      this.entryValue.reset();
      this.selectedDatasetLabel.set(label);
      this.editPointForm.get('selectedPoint')?.reset();
      this.editPointForm.get('value')?.reset();
    });

    this.preselectDatasetIfSingle();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stat']) {
      const previous: Stat | undefined = changes['stat'].previousValue;
      const dataset = this.stat.datasets.find(ds => ds.label === this.editPointForm?.get('dataset')?.value);
      if (previous && dataset && isPercentageInput(previous) !== isPercentageInput(this.stat)) {
        const control = this.editPointForm.get('value')!;
        if (control.value !== null) {
          control.setValue(this.entryValue.switchMode(String(control.value), dataset, isPercentageInput(this.stat)),
            {emitEvent: false});
        }
      }
      this.preselectDatasetIfSingle();
    }
  }

  prefillPoint(datasetLabel: string, point: DataPoint): void {
    this.editPointForm.patchValue({dataset: datasetLabel});
    this.selectedDatasetLabel.set(datasetLabel);

    const sorted = this.sortedDataPoints();
    const match = sorted.find(p => p.x === point.x && p.y === point.y);
    if (match) {
      this.editPointForm.patchValue({selectedPoint: match});
      this.setPointValue(match);
    }
  }

  onPointSelected(event: MatSelectChange): void {
    this.setPointValue(event.value);
  }

  private setPointValue(point: DataPoint): void {
    const dataset = this.stat.datasets.find(ds => ds.label === this.selectedDatasetLabel());
    const value = dataset && this.stat.yAxisFormat === 'percentage'
      ? this.entryValue.displayCount(point.y, dataset, isPercentageInput(this.stat)) : point.y;
    this.editPointForm.get('value')!.setValue(value, {emitEvent: false});
  }

  pointInputValue(point: DataPoint): string {
    const dataset = this.stat.datasets.find(ds => ds.label === this.selectedDatasetLabel());
    return isPercentageInput(this.stat) && dataset ? formatInputNumber(countToPercentage(Number(point.y), dataset)) : point.y;
  }

  onEditPoint(): void {
    if (this.editPointForm.get('selectedPoint')?.invalid || !this.stat) return;
    this.submissionError.set('');

    const datasetLabel: string = this.editPointForm.get('dataset')?.value;
    const selected: DataPoint = this.editPointForm.get('selectedPoint')?.value;
    const newValue = this.editPointForm.get('value')?.value;

    if (newValue === null || newValue === undefined || newValue === '') {
      const dialogRef = this.dialog.open(ConfirmDialog);
      dialogRef.afterClosed().subscribe(confirmed => {
        if (confirmed) {
          this.deletePoint(datasetLabel, selected);
        }
      });
    } else {
      if (this.stat.yAxisFormat === 'pace' && !Number.isFinite(parseYAxisValue(String(newValue), this.stat))) {
        this.submissionError.set('Enter pace as m:ss or M.SS with seconds between 00 and 59.');
        return;
      }
      let value = String(newValue);
      const dataset = this.stat.datasets.find(ds => ds.label === datasetLabel);
      if (dataset && this.stat.yAxisFormat === 'percentage') {
        value = this.entryValue.toCount(value, dataset, isPercentageInput(this.stat));
      }
      if (isPercentageInput(this.stat)) {
        if (!dataset || !value.trim() || !Number.isFinite(Number(value))) {
          this.submissionError.set('Enter a finite percentage and select a dataset with a valid target.');
          return;
        }
      }
      this.replacePoint(datasetLabel, selected, value);
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
    if (this.stat.datasets.length === 1 && this.editPointForm.get('dataset')?.value !== this.stat.datasets[0].label) {
      const label = this.stat.datasets[0].label;
      this.editPointForm.patchValue({dataset: label});
      this.selectedDatasetLabel.set(label);
    }
  }
}
