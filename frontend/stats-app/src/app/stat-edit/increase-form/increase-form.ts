import {Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges} from '@angular/core';
import {MatError, MatFormField, MatInput, MatInputModule, MatLabel} from '@angular/material/input';
import {MatDatepicker, MatDatepickerInput, MatDatepickerToggle} from '@angular/material/datepicker';
import {MatIcon} from '@angular/material/icon';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {DataPoint, Stat} from '../../models/stat';
import {StatService} from '../../services/stat-service';
import {MatButton} from '@angular/material/button';
import {MatOption} from '@angular/material/core';
import {MatSelect} from '@angular/material/select';

@Component({
  selector: 'app-increase-form',
  imports: [
    MatFormFieldModule,
    MatInputModule,
    MatFormField,
    MatLabel,
    MatDatepickerToggle,
    MatDatepicker,
    MatError,
    MatIcon,
    ReactiveFormsModule,
    MatInput,
    MatDatepickerInput,
    MatButton,
    MatSelect,
    MatOption
  ],
  templateUrl: './increase-form.html',
  styleUrl: './increase-form.css',
})
export class IncreaseForm implements OnInit, OnChanges {

  @Input() stat!: Stat;
  @Output() pointChanged = new EventEmitter<void>();
  increaseForm!: FormGroup;

  constructor(private statService: StatService, private formBuilder: FormBuilder) {
  }

  ngOnInit(): void {
    this.increaseForm = this.formBuilder.group({
      dataset: [null, Validators.required],
      x: ['', Validators.required],
      amount: ['', Validators.required]
    }, {updateOn: 'blur'});
    this.preselectDatasetIfSingle();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['stat']) {
      this.preselectDatasetIfSingle();
    }
  }

  onIncrease(): void {
    if (this.increaseForm.invalid || !this.stat) return;

    const datasetLabel: string = this.increaseForm.get('dataset')?.value;
    const dataPoints = this.stat.datasets.find(ds => ds.label === datasetLabel)?.dataPoints ?? [];
    const latestPoint = [...dataPoints]
      .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime())
      .at(-1);

    if (!latestPoint) return;

    const newValue = parseFloat(latestPoint.y) + parseFloat(this.increaseForm.get('amount')?.value);

    const newPoint: DataPoint = {
      x: this.increaseForm.get('x')?.value.toFormat('yyyy-MM-dd'),
      y: newValue.toString()
    };

    this.statService.addDataPoint(this.stat!.id, datasetLabel, newPoint).subscribe({
      next: () => {
        this.pointChanged.emit();
        this.increaseForm.reset();
        this.preselectDatasetIfSingle();
      },
      error: err => console.error(err)
    });
  }

  private preselectDatasetIfSingle(): void {
    if (!this.increaseForm || !this.stat) return;
    if (this.stat.datasets.length === 1) {
      this.increaseForm.patchValue({dataset: this.stat.datasets[0].label});
    }
  }
}
