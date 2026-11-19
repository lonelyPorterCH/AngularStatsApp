import {Component, Input} from '@angular/core';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {TestBed} from '@angular/core/testing';
import {provideRouter, ActivatedRoute, convertToParamMap} from '@angular/router';
import {of} from 'rxjs';
import {Stat} from '../models/stat';
import {StatEdit} from './stat-edit';
import {ChartComponent} from '../chart/chart';
import {environment} from '../../environments/environment';

@Component({selector: 'app-chart', template: ''})
class ChartStub {
  @Input() stat!: Stat;
}

describe('StatEdit X-axis settings', () => {
  it('saves numeric scale settings on the edit page and shows the unit only for numeric scales', async () => {
    await TestBed.configureTestingModule({
      imports: [StatEdit],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {paramMap: of(convertToParamMap({}))}
        }
      ]
    }).overrideComponent(StatEdit, {
      remove: {imports: [ChartComponent]}, add: {imports: [ChartStub]}
    }).compileComponents();

    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(StatEdit);
    const component = fixture.componentInstance;
    component.stat.set({id: 'salary', title: 'Salary', xAxisName: 'Year', yAxisName: 'CHF',
      reverse: false, xAxisScaleType: 'time', datasets: []});
    component.xAxisForm.reset({xAxisScaleType: 'time', xAxisUnit: ''});
    fixture.detectChanges();

    const xAxis = fixture.nativeElement.querySelector('[aria-label="X axis settings"]');
    expect(xAxis.querySelector('mat-select[formControlName="xAxisScaleType"]')).toBeTruthy();
    expect(xAxis.querySelector('[formControlName="xAxisUnit"]')).toBeNull();

    component.xAxisForm.setValue({xAxisScaleType: 'linear', xAxisUnit: 'CHF'});
    component.xAxisForm.markAsDirty();
    fixture.detectChanges();
    expect(xAxis.querySelector('[formControlName="xAxisUnit"]')).toBeTruthy();
    component.onXAxisSave();

    const request = http.expectOne(`${environment.apiBaseUrl}/salary/axes`);
    expect(request.request.body).toEqual({xAxisName: 'Year', yAxisName: 'CHF',
      xAxisScaleType: 'linear', xAxisUnit: 'CHF'});
    request.flush(null);
    expect(component.stat()).toMatchObject({xAxisScaleType: 'linear', xAxisUnit: 'CHF'});

    component.xAxisForm.patchValue({xAxisScaleType: 'time'});
    fixture.detectChanges();
    expect(xAxis.querySelector('[formControlName="xAxisUnit"]')).toBeNull();
    http.verify();
    fixture.destroy();
  });
});
