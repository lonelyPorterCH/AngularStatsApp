import {Component, OnInit} from '@angular/core';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {MatButton} from '@angular/material/button';
import {idExistsValidator} from '../validators/id-exists.validator';
import {StatService} from '../services/stat-service';
import {MatError, MatFormField, MatInput, MatLabel} from '@angular/material/input';
import {MatCheckbox} from '@angular/material/checkbox';
import {Stat} from '../models/stat';
import {Router} from '@angular/router';
import {MatOption} from '@angular/material/core';
import {MatSelect} from '@angular/material/select';

@Component({
  selector: 'app-create-form',
  imports: [
    ReactiveFormsModule,
    MatButton,
    MatError,
    MatFormField,
    MatLabel,
    MatInput,
    MatCheckbox,
    MatOption,
    MatSelect
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
      chartType: ['line', Validators.required],
      effortComparison: [false],
      yAxisFormat: ['number', Validators.required],
      xAxisName: ['', Validators.required],
      yAxisName: ['', Validators.required],
      reverse: [false, Validators.required],
      stacked: [false],
      includeZero: [false],
      xAxisScaleType: ['time', Validators.required],
      xAxisUnit: ['']
    }, {updateOn: 'blur'});
  }

  onChartTypeChange(chartType: 'line' | 'bar'): void {
    if (chartType !== 'bar') return;
    for (const setting of ['stacked', 'includeZero']) {
      const control = this.statForm.get(setting);
      if (control?.pristine) control.setValue(true);
    }
  }

  protected onSubmit(): void {
    if (this.statForm.invalid) {
      return
    }

    const newStat: Stat = {
      id: this.statForm.value.id,
      title: this.statForm.value.title,
      chartType: this.statForm.value.chartType,
      effortComparison: this.statForm.value.effortComparison,
      yAxisFormat: this.statForm.value.yAxisFormat,
      xAxisName: this.statForm.value.xAxisName,
      yAxisName: this.statForm.value.yAxisName,
      reverse: this.statForm.value.reverse,
      stacked: this.statForm.value.stacked,
      includeZero: this.statForm.value.includeZero,
      xAxisScaleType: this.statForm.value.xAxisScaleType,
      xAxisUnit: this.statForm.value.xAxisUnit?.trim(),
      datasets: []
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
