import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatButton} from '@angular/material/button';

@Component({
  selector: 'app-create-form',
  imports: [
    ReactiveFormsModule,
    MatButton
  ],
  templateUrl: './create-form.html',
  styleUrl: './create-form.css',
})
export class CreateForm implements OnInit {
  statForm!: FormGroup;

  constructor(private formBuilder: FormBuilder) {
  }

  ngOnInit(): void {
    this.statForm = this.formBuilder.group({
      id: ['', Validators.required],
      title: ['', Validators.required],
      xAxisName: ['', Validators.required],
      yAxisName: ['', Validators.required],
      reverse: [true, Validators.required]
    })
  }
}
