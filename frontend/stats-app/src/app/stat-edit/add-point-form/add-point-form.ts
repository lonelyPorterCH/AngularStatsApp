import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {DataPoint, Stat} from '../../models/stat';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {StatService} from '../../services/stat-service';
import {MatError, MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {MatDatepicker, MatDatepickerInput, MatDatepickerToggle} from '@angular/material/datepicker';
import {MatIcon} from '@angular/material/icon';
import {MatButton} from '@angular/material/button';

@Component({
  selector: 'app-add-point-form',
  imports: [
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
      x: this.addPointForm.get('x')?.value,
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
