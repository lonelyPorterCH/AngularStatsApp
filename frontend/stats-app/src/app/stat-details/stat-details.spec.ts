import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatDetails } from './stat-details';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter, ActivatedRoute, convertToParamMap} from '@angular/router';
import {MatDialog} from '@angular/material/dialog';
import {of} from 'rxjs';
import {environment} from '../../environments/environment';
import {Stat} from '../models/stat';

describe('StatDetails', () => {
  let component: StatDetails;
  let fixture: ComponentFixture<StatDetails>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatDetails],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({}))
          }
        },
        {
          provide: MatDialog,
          useValue: {
            open: () => ({afterClosed: () => of(false)})
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StatDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const stat: Stat = {id: 'weight', title: 'Weight', xAxisName: 'Date', yAxisName: 'kg', reverse: false, datasets: []};

  it('saves comparison once, blocks incompatible controls, and preserves their saved preferences', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set({...stat, smoothing: true, stacked: true});
    component.onEffortComparisonChange(true);
    component.onEffortComparisonChange(false);
    component.onSmoothingChange(false);
    component.onStackedChange(false);
    expect(component.stat()?.effortComparison).toBe(true);
    expect(component.effortComparisonSaving()).toBe(true);
    const request = http.expectOne(`${environment.apiBaseUrl}/weight/effort-comparison`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({effortComparison: true});
    request.flush(null);
    expect(component.effortComparisonSaving()).toBe(false);
    expect(component.stat()?.smoothing).toBe(true);
    expect(component.stat()?.stacked).toBe(true);
    component.onEffortComparisonChange(false);
    http.expectOne(`${environment.apiBaseUrl}/weight/effort-comparison`).flush(null);
    expect(component.stat()?.effortComparison).toBe(false);
    http.verify();
  });

  it('rolls comparison back after failure without losing concurrent settings', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set(stat);
    component.onEffortComparisonChange(true);
    component.stat.update(current => ({...current!, includeZero: true}));
    http.expectOne(`${environment.apiBaseUrl}/weight/effort-comparison`)
      .flush('Failed', {status: 500, statusText: 'Error'});
    expect(component.stat()?.effortComparison).toBe(false);
    expect(component.stat()?.includeZero).toBe(true);
    expect(component.effortComparisonError()).toContain('previous setting');
    expect(component.effortComparisonSaving()).toBe(false);
    http.verify();
  });

  it('saves pace format and explains validation failures while restoring the previous format', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set(stat);
    component.onYAxisFormatChange('pace');
    component.onYAxisFormatChange('number');
    const request = http.expectOne(`${environment.apiBaseUrl}/weight/y-axis-format`);
    expect(request.request.body).toEqual({yAxisFormat: 'pace'});
    request.flush(null);
    expect(component.stat()?.yAxisFormat).toBe('pace');
    component.onYAxisFormatChange('number');
    http.expectOne(`${environment.apiBaseUrl}/weight/y-axis-format`).flush(null);
    component.onYAxisFormatChange('pace');
    http.expectOne(`${environment.apiBaseUrl}/weight/y-axis-format`)
      .flush('Pace must have seconds between 00 and 59', {status: 400, statusText: 'Bad Request'});
    expect(component.stat()?.yAxisFormat).toBe('number');
    expect(component.yAxisFormatError()).toContain('seconds between');
    expect(component.yAxisFormatSaving()).toBe(false);
    http.verify();
  });

  it('does not save archived comparison or value format settings or enable comparison on bars', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set(stat);
    component.archived.set(true);
    component.onEffortComparisonChange(true);
    component.onYAxisFormatChange('pace');
    component.archived.set(false);
    component.stat.set({...stat, chartType: 'bar'});
    component.onEffortComparisonChange(true);
    http.verify();
  });

  it('saves chart type once and preserves the data and line preferences', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set({...stat, smoothing: true});
    component.onChartTypeChange('bar');
    component.onChartTypeChange('line');
    expect(component.chartTypeSaving()).toBe(true);
    expect(component.stat()?.chartType).toBe('bar');
    const request = http.expectOne(`${environment.apiBaseUrl}/weight/chart-type`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({chartType: 'bar'});
    request.flush(null);
    expect(component.chartTypeSaving()).toBe(false);
    expect(component.stat()?.datasets).toBe(stat.datasets);
    expect(component.stat()?.smoothing).toBe(true);
    component.onSmoothingChange(false);
    http.expectNone(`${environment.apiBaseUrl}/weight/smoothing`);
    component.onChartTypeChange('line');
    http.expectOne(`${environment.apiBaseUrl}/weight/chart-type`).flush(null);
    expect(component.stat()?.chartType).toBe('line');
    http.verify();
  });

  it('rolls back a failed chart-type save without replacing other display settings', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set(stat);
    component.onChartTypeChange('bar');
    component.stat.update(current => ({...current!, includeZero: true}));
    http.expectOne(`${environment.apiBaseUrl}/weight/chart-type`).flush('Failed', {status: 500, statusText: 'Error'});
    expect(component.stat()?.chartType).toBe('line');
    expect(component.stat()?.includeZero).toBe(true);
    expect(component.chartTypeError()).toContain('previous setting');
    expect(component.chartTypeSaving()).toBe(false);
    http.verify();
  });

  it('does not save chart types for archived graphs or roll back a different graph', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set(stat);
    component.archived.set(true);
    component.onChartTypeChange('bar');
    http.expectNone(`${environment.apiBaseUrl}/weight/chart-type`);
    component.archived.set(false);
    component.onChartTypeChange('bar');
    component.stat.set({...stat, id: 'other'});
    http.expectOne(`${environment.apiBaseUrl}/weight/chart-type`).flush('Failed', {status: 500, statusText: 'Error'});
    expect(component.stat()?.chartType).toBeUndefined();
    expect(component.chartTypeError()).toBe('');
    expect(component.chartTypeSaving()).toBe(false);
    http.verify();
  });

  it('explains why a chart cannot be converted to bars', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set(stat);
    component.onChartTypeChange('bar');
    http.expectOne(`${environment.apiBaseUrl}/weight/chart-type`)
      .flush('Bar charts require one value per dataset and X value.', {status: 400, statusText: 'Bad Request'});
    expect(component.stat()?.chartType).toBe('line');
    expect(component.chartTypeError()).toContain('one value per dataset');
    expect(component.chartTypeError()).toContain('previous setting');
    http.verify();
  });

  it('saves the zero baseline for any chart, prevents duplicate saves and supports turning it off', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set(stat);
    component.onIncludeZeroChange(true);
    component.onIncludeZeroChange(false);
    expect(component.stat()?.includeZero).toBe(true);
    expect(component.includeZeroSaving()).toBe(true);
    const request = http.expectOne(`${environment.apiBaseUrl}/weight/include-zero`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({includeZero: true});
    request.flush(null);
    expect(component.includeZeroSaving()).toBe(false);
    expect(component.stat()?.datasets).toBe(stat.datasets);
    expect(stat.includeZero).toBeUndefined();
    component.onIncludeZeroChange(false);
    const offRequest = http.expectOne(`${environment.apiBaseUrl}/weight/include-zero`);
    expect(offRequest.request.body).toEqual({includeZero: false});
    offRequest.flush(null);
    expect(component.stat()?.includeZero).toBe(false);
    http.verify();
  });

  it('restores the Y axis setting after a save failure without undoing other settings', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set({...stat, includeZero: true});
    component.onIncludeZeroChange(false);
    component.stat.update(current => current ? {...current, smoothing: true} : current);
    http.expectOne(`${environment.apiBaseUrl}/weight/include-zero`).flush('Failed', {status: 500, statusText: 'Error'});
    expect(component.stat()?.includeZero).toBe(true);
    expect(component.stat()?.smoothing).toBe(true);
    expect(component.includeZeroSaving()).toBe(false);
    expect(component.includeZeroError()).toContain('previous setting');
    http.verify();
  });

  it('does not save the Y axis setting for archived graphs or overwrite another graph after failure', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set(stat);
    component.archived.set(true);
    component.onIncludeZeroChange(true);
    http.expectNone(`${environment.apiBaseUrl}/weight/include-zero`);
    component.archived.set(false);
    component.onIncludeZeroChange(true);
    component.stat.set({...stat, id: 'other'});
    http.expectOne(`${environment.apiBaseUrl}/weight/include-zero`).flush('Failed', {status: 500, statusText: 'Error'});
    expect(component.stat()?.id).toBe('other');
    expect(component.stat()?.includeZero).toBeUndefined();
    expect(component.includeZeroError()).toBe('');
    expect(component.includeZeroSaving()).toBe(false);
    http.verify();
  });

  const stackable: Stat = {...stat, datasets: [
    {label: 'Paid out', index: 0, dataPoints: [{x: '2026-09-30', y: '1000'}]},
    {label: 'Carried forward', index: 1, dataPoints: [{x: '2026-09-30', y: '391'}]}
  ]};

  it('saves stacking, prevents duplicate saves and preserves measurements', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set(stackable);
    component.onStackedChange(true);
    component.onStackedChange(false);
    expect(component.stat()?.stacked).toBe(true);
    expect(component.stackedSaving()).toBe(true);
    const request = http.expectOne(`${environment.apiBaseUrl}/weight/stacked`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({stacked: true});
    request.flush(null);
    expect(component.stackedSaving()).toBe(false);
    expect(component.stat()?.datasets).toBe(stackable.datasets);
    expect(stackable.stacked).toBeUndefined();
    http.verify();
  });

  it('restores stacking after a failed save without undoing other settings', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set({...stackable, stacked: true});
    component.onStackedChange(false);
    component.stat.update(current => ({...current!, smoothing: true}));
    http.expectOne(`${environment.apiBaseUrl}/weight/stacked`).flush('Failed', {status: 500, statusText: 'Error'});
    expect(component.stat()?.stacked).toBe(true);
    expect(component.stat()?.smoothing).toBe(true);
    expect(component.stackedSaving()).toBe(false);
    expect(component.stackedError()).toContain('previous setting');
    http.verify();
  });

  it('does not enable stacking on archived or single-dataset charts but allows disabling it', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set(stackable);
    component.archived.set(true);
    component.onStackedChange(true);
    http.expectNone(`${environment.apiBaseUrl}/weight/stacked`);
    component.archived.set(false);
    component.stat.set({...stat, stacked: true});
    component.onStackedChange(true);
    http.expectNone(`${environment.apiBaseUrl}/weight/stacked`);
    component.onStackedChange(false);
    http.expectOne(`${environment.apiBaseUrl}/weight/stacked`).flush(null);
    expect(component.stat()?.stacked).toBe(false);
    http.verify();
  });

  it('saves smoothing and updates this graph without changing recorded data', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set(stat);
    component.onSmoothingChange(true);
    expect(component.stat()?.smoothing).toBe(true);
    expect(component.smoothingSaving()).toBe(true);
    component.onSmoothingChange(false);
    const request = http.expectOne(`${environment.apiBaseUrl}/weight/smoothing`);
    expect(request.request.body).toEqual({smoothing: true});
    request.flush(null);
    expect(component.smoothingSaving()).toBe(false);
    expect(stat.smoothing).toBeUndefined();
    http.verify();
  });

  it('restores the previous smoothing setting after a save failure', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set({...stat, smoothing: true});
    component.onSmoothingChange(false);
    const request = http.expectOne(`${environment.apiBaseUrl}/weight/smoothing`);
    request.flush('Failed', {status: 500, statusText: 'Error'});
    expect(component.stat()?.smoothing).toBe(true);
    expect(component.smoothingSaving()).toBe(false);
    expect(component.smoothingError()).toContain('previous setting');
    http.verify();
  });

  it('does not save smoothing for archived graphs', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set(stat);
    component.archived.set(true);
    component.onSmoothingChange(true);
    http.expectNone(`${environment.apiBaseUrl}/weight/smoothing`);
    expect(component.stat()?.smoothing).toBeUndefined();
    http.verify();
  });
});
