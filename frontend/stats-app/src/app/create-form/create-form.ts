import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatButton} from '@angular/material/button';
import {idExistsValidator} from '../validators/id-exists.validator';
import {StatService} from '../services/stat-service';
import {MatError, MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {MatCheckbox} from '@angular/material/checkbox';
import {Stat} from '../models/stat';
import {Router} from '@angular/router';

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
  submissionError: string = '';

  constructor(private formBuilder: FormBuilder, private statService: StatService, private router: Router) {
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

  protected onSubmit(): void {
    if (this.statForm.invalid) {
      return
    }

    const newStat: Stat = {
      id: this.statForm.value.id,
      title: this.statForm.value.title,
      xAxisName: this.statForm.value.xAxisName,
      yAxisName: this.statForm.value.yAxisName,
      reverse: this.statForm.value.reverse,
      dataPoints: []
    }

    this.statService.addStat(newStat).subscribe({
      next: () => {
        this.router.navigate(['/stats', this.statForm.get('id')?.value]);
      },
      error: err => {
        console.error(err);
        this.submissionError = 'There was a problem saving your stat';
      }
    });
  }
}
