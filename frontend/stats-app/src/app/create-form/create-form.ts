import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatButton} from '@angular/material/button';
import {idExistsValidator} from '../validators/id-exists.validator';
import {StatService} from '../services/stat-service';
import {MatError, MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {MatCheckbox} from '@angular/material/checkbox';

@Component({
  selector: 'app-create-form',
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatError,
    MatFormField,
    MatLabel,
    MatInput,
    MatCheckbox
  ],
  templateUrl: './create-form.html',
  styleUrl: './create-form.css',
})
export class CreateForm implements OnInit {
  statForm!: FormGroup;

  constructor(private formBuilder: FormBuilder, private statService: StatService) {
  }

  ngOnInit(): void {
    this.statForm = this.formBuilder.group({
      id: ['', Validators.required, idExistsValidator(this.statService)],
      title: ['', Validators.required],
      xAxisName: ['', Validators.required],
      yAxisName: ['', Validators.required],
      reverse: [false, Validators.required]
    }, {updateOn: 'blur'});
  }
}
