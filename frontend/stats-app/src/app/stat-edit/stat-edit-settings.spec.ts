import {Component, Input} from '@angular/core';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideRouter, ActivatedRoute, convertToParamMap} from '@angular/router';
import {of} from 'rxjs';
import {environment} from '../../environments/environment';
import {Stat} from '../models/stat';
import {ChartComponent} from '../chart/chart';
import {StatEdit} from './stat-edit';

@Component({selector: 'app-chart', template: ''})
class ChartStub {
  @Input() stat!: Stat;
}

describe('StatEdit settings sections', () => {
  let component: StatEdit;
  let fixture: ComponentFixture<StatEdit>;

  const stat: Stat = {id: 'weight', title: 'Weight', xAxisName: 'Date', yAxisName: 'kg',
    reverse: false, datasets: []};

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatEdit],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {provide: ActivatedRoute, useValue: {paramMap: of(convertToParamMap({}))}}
      ]
    }).overrideComponent(StatEdit, {
      remove: {imports: [ChartComponent]}, add: {imports: [ChartStub]}
    }).compileComponents();

    fixture = TestBed.createComponent(StatEdit);
    component = fixture.componentInstance;
  });

  it('gives each settings section a matching Save button aligned to the left', () => {
    component.stat.set(stat);
    fixture.detectChanges();

    const page: HTMLElement = fixture.nativeElement;
    const buttons = Array.from(page.querySelectorAll<HTMLButtonElement>('.settings-grid .form-actions button'));
    expect(buttons.map(button => button.textContent.trim())).toEqual([
      'Save general settings',
      'Save chart display settings',
      'Save X-axis settings',
      'Save Y-axis settings'
    ]);
    expect(buttons.every(button => button.classList.contains('mat-mdc-outlined-button'))).toBe(true);
    expect(Array.from(page.querySelectorAll<HTMLElement>('.settings-grid .form-actions'))
      .every(actions => getComputedStyle(actions).justifyContent === 'flex-start')).toBe(true);
  });

  it('stages chart display settings and saves changed API operations sequentially', () => {
    const http = TestBed.inject(HttpTestingController);
    const stackable: Stat = {...stat, datasets: [
      {label: 'A', index: 0, dataPoints: []},
      {label: 'B', index: 1, dataPoints: []}
    ]};
    component.stat.set(stackable);
    component.chartDisplayForm.setValue({chartType: 'bar', effortComparison: false, stacked: true});
    component.chartDisplayForm.markAsDirty();

    http.expectNone(`${environment.apiBaseUrl}/weight/chart-type`);
    component.onChartDisplaySave();
    const chartTypeRequest = http.expectOne(`${environment.apiBaseUrl}/weight/chart-type`);
    expect(chartTypeRequest.request.body).toEqual({chartType: 'bar'});
    chartTypeRequest.flush(null);

    const stackedRequest = http.expectOne(`${environment.apiBaseUrl}/weight/stacked`);
    expect(stackedRequest.request.body).toEqual({stacked: true});
    stackedRequest.flush(null);
    expect(component.stat()).toMatchObject({chartType: 'bar', stacked: true});
    expect(component.chartDisplayForm.pristine).toBe(true);
    http.verify();
  });

  it('retains confirmed chart display changes if a later save fails', () => {
    const http = TestBed.inject(HttpTestingController);
    const stackable: Stat = {...stat, datasets: [
      {label: 'A', index: 0, dataPoints: []},
      {label: 'B', index: 1, dataPoints: []}
    ]};
    component.stat.set(stackable);
    component.chartDisplayForm.setValue({chartType: 'bar', effortComparison: false, stacked: true});
    component.chartDisplayForm.markAsDirty();
    component.onChartDisplaySave();

    http.expectOne(`${environment.apiBaseUrl}/weight/chart-type`).flush(null);
    http.expectOne(`${environment.apiBaseUrl}/weight/stacked`)
      .flush('Failed', {status: 500, statusText: 'Error'});

    expect(component.stat()).toMatchObject({chartType: 'bar'});
    expect(component.stat()?.stacked).toBeUndefined();
    expect(component.chartDisplayForm.getRawValue()).toEqual({
      chartType: 'bar', effortComparison: false, stacked: false
    });
    expect(component.chartDisplayError()).toContain('last confirmed settings');
    expect(component.chartDisplaySaving()).toBe(false);
    http.verify();
  });

  it('saves Y-axis format and bounds together and reflects partial success on failure', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set(stat);
    component.yAxisForm.setValue({yAxisFormat: 'pace', yAxisMin: 0, yAxisMax: 100});
    component.yAxisForm.markAsDirty();
    component.onYAxisSave();

    const formatRequest = http.expectOne(`${environment.apiBaseUrl}/weight/y-axis-format`);
    expect(formatRequest.request.body).toEqual({yAxisFormat: 'pace'});
    formatRequest.flush(null);
    const boundsRequest = http.expectOne(`${environment.apiBaseUrl}/weight/y-axis-bounds`);
    expect(boundsRequest.request.body).toEqual({yAxisMin: 0, yAxisMax: 100});
    boundsRequest.flush('Invalid bounds', {status: 400, statusText: 'Bad Request'});

    expect(component.stat()).toMatchObject({yAxisFormat: 'pace'});
    expect(component.stat()?.yAxisMin).toBeUndefined();
    expect(component.stat()?.yAxisMax).toBeUndefined();
    expect(component.yAxisForm.getRawValue()).toEqual({yAxisFormat: 'pace', yAxisMin: null, yAxisMax: null});
    expect(component.yAxisError()).toContain('Invalid bounds');
    expect(component.yAxisSaving()).toBe(false);
    http.verify();
  });
});
