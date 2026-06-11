import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatError, MatFormField, MatInput, MatInputModule, MatLabel} from '@angular/material/input';
import {DataPoint, Stat} from '../../models/stat';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {StatService} from '../../services/stat-service';
import {MatDatepicker, MatDatepickerInput, MatDatepickerToggle} from '@angular/material/datepicker';
import {MatIcon} from '@angular/material/icon';
import {MatButton} from '@angular/material/button';
import {MatOption} from '@angular/material/core';
import {MatSelect} from '@angular/material/select';
import {MatTooltip} from '@angular/material/tooltip';

@Component({
  selector: 'app-add-point-form',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatFormField,
    MatLabel,
    MatDatepickerInput,
    MatDatepickerToggle,
    MatDatepicker,
    MatError,
    MatIcon,
    ReactiveFormsModule,
    MatInput,
    MatButton,
    MatSelect,
    MatOption,
    MatTooltip
  ],
  templateUrl: './add-point-form.html',
  styleUrl: './add-point-form.css'
})
export class AddPointForm implements OnInit, OnChanges {

  @Input() stat!: Stat;
  @Output() pointChanged = new EventEmitter<void>();
  addPointForm!: FormGroup;

  constructor(
    private statService: StatService,
    private formBuilder: FormBuilder
  ) {
  }

  ngOnInit(): void {
    this.addPointForm = this.formBuilder.group({
      dataset: [null, Validators.required],
      x: ['', Validators.required],
      y: ['', Validators.required]
    }, {updateOn: 'blur'});
    this.preselectDatasetIfSingle();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stat']) {
      this.preselectDatasetIfSingle();
    }
  }

  onAddPoint(): void {
    if (this.addPointForm.invalid || !this.stat) return;

    const datasetLabel: string = this.addPointForm.get('dataset')?.value;
    const yInput: string = this.addPointForm.get('y')?.value;
    const date = this.addPointForm.get('x')?.value.toFormat('yyyy-MM-dd');

    if (yInput.startsWith('+')) {
      // Increment mode: add the amount to the latest value
      this.handleIncrement(datasetLabel, date, yInput);
    } else {
      // Regular mode: add point with exact value
      const newPoint: DataPoint = {
        x: date,
        y: yInput
      };
      this.addDataPointAndReset(datasetLabel, newPoint);
    }
  }

  private handleIncrement(datasetLabel: string, date: string, amountStr: string): void {
    const dataPoints = this.stat!.datasets.find(ds => ds.label === datasetLabel)?.dataPoints ?? [];
    const latestPoint = [...dataPoints]
      .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime())
      .at(-1);

    if (!latestPoint) {
      console.error('No latest point found for increment operation');
      return;
    }

    const amount = parseFloat(amountStr.substring(1));
    const newValue = parseFloat(latestPoint.y) + amount;

    const newPoint: DataPoint = {
      x: date,
      y: newValue.toString()
    };

    this.addDataPointAndReset(datasetLabel, newPoint);
  }

  private addDataPointAndReset(datasetLabel: string, newPoint: DataPoint): void {
    this.statService.addDataPoint(this.stat!.id, datasetLabel, newPoint).subscribe({
      next: () => {
        this.pointChanged.emit();
        this.addPointForm.reset();
        this.preselectDatasetIfSingle();
      },
      error: err => console.error(err)
    });
  }

  private preselectDatasetIfSingle(): void {
    if (!this.addPointForm || !this.stat) return;
    if (this.stat.datasets.length === 1) {
      this.addPointForm.patchValue({dataset: this.stat.datasets[0].label});
    }
  }
}
