import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {MatFormFieldModule} from '@angular/material/form-field';
import {MatError, MatFormField, MatInput, MatInputModule, MatLabel} from '@angular/material/input';
import {DataPoint, Stat} from '../../models/stat';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {StatService} from '../../services/stat-service';
import {MatDatepicker, MatDatepickerInput, MatDatepickerToggle} from '@angular/material/datepicker';
import {MatIcon} from '@angular/material/icon';
import {MatButton} from '@angular/material/button';
import {DateTime} from 'luxon';

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
    MatButton
  ],
  templateUrl: './add-point-form.html',
  styleUrl: './add-point-form.css'
})
export class AddPointForm implements OnInit {

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
      x: ['', Validators.required],
      y: ['', Validators.required]
    }, {updateOn: 'blur'});
  }

  onAddPoint(): void {
    if (this.addPointForm.invalid || !this.stat) return;

    const newPoint: DataPoint = {
      x: DateTime.fromJSDate(this.addPointForm.get('x')?.value).toFormat('yyyy-MM-dd'),
      y: this.addPointForm.get('y')?.value
    };

    this.statService.addDataPoint(this.stat!.id, newPoint).subscribe({
      next: () => {
        this.pointChanged.emit();
        this.addPointForm.reset();
      },
      error: err => console.error(err)
    });
  }
}
