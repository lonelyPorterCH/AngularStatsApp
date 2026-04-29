import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {MatError, MatFormField, MatInput, MatInputModule, MatLabel} from '@angular/material/input';
import {MatDatepicker, MatDatepickerInput, MatDatepickerToggle} from '@angular/material/datepicker';
import {MatIcon} from '@angular/material/icon';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatFormFieldModule} from '@angular/material/form-field';
import {DataPoint, Stat} from '../../models/stat';
import {StatService} from '../../services/stat-service';
import {MatButton} from '@angular/material/button';
import {DateTime} from 'luxon';

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
    MatButton
  ],
  templateUrl: './increase-form.html',
  styleUrl: './increase-form.css',
})
export class IncreaseForm implements OnInit {

  @Input() stat!: Stat;
  @Output() pointChanged = new EventEmitter<void>();
  increaseForm!: FormGroup;

  constructor(private statService: StatService, private formBuilder: FormBuilder) {
  }

  ngOnInit(): void {
    this.increaseForm = this.formBuilder.group({
      x: ['', Validators.required],
      amount: ['', Validators.required]
    }, {updateOn: 'blur'});
  }

  onIncrease(): void {
    if (this.increaseForm.invalid || !this.stat) return;

    const latestPoint = this.stat!.dataPoints
      .sort((a, b) => new Date(a.x).getTime() - new Date(b.x).getTime())
      .at(-1);

    if (!latestPoint) return;

    const newValue = parseFloat(latestPoint.y) + parseFloat(this.increaseForm.get('amount')?.value);

    const newPoint: DataPoint = {
      x: DateTime.fromJSDate(this.increaseForm.get('x')?.value).toFormat('yyyy-MM-dd'),
      y: newValue.toString()
    };

    this.statService.addDataPoint(this.stat!.id, newPoint).subscribe({
      next: () => {
        this.pointChanged.emit();
        this.increaseForm.reset();
      },
      error: err => console.error(err)
    });
  }
}
