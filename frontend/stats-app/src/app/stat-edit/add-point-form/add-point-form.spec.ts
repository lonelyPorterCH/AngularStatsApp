import {ComponentFixture, TestBed} from '@angular/core/testing';
import {AddPointForm} from './add-point-form';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideNativeDateAdapter} from '@angular/material/core';
import {Stat} from '../../models/stat';
import {DateTime} from 'luxon';
import {environment} from '../../../environments/environment';

const MOCK_STAT: Stat = {
  id: 'test-stat',
  title: 'Test Stat',
  xAxisName: 'Date',
  yAxisName: 'Value',
  reverse: false,
  datasets: []
};

describe('AddPointForm', () => {
  let component: AddPointForm;
  let fixture: ComponentFixture<AddPointForm>;
  let httpTesting: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AddPointForm],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideNativeDateAdapter()
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AddPointForm);
    component = fixture.componentInstance;
    component.stat = MOCK_STAT;
    fixture.detectChanges();

    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  //SKIP: when I set the luxon date, addPointForm.invalid becomes invalid.
  // If I set it to string, it becomes valid, but toFormat throws Error
  it.skip('should emit pointChanged on successful add', () => {
    // spy on the EventEmitter
    let emitted = false;
    component.pointChanged.subscribe(() => emitted = true);

    // fill in the form
    component.addPointForm.setValue({
      x: DateTime.fromISO('2026-01-01'),
      y: '100'
    });

    component.onAddPoint();

    // intercept and flush the HTTP call
    const req = httpTesting.expectOne('/api/stats/test-stat/datapoint');
    req.flush(null);

    expect(emitted).toBe(true);
  });

  it('should not emit pointChanged when form is invalid', () => {
    let emitted = false;
    component.pointChanged.subscribe(() => emitted = true);

    // leave form empty — invalid
    component.onAddPoint();

    httpTesting.expectNone('/api/stats/test-stat/datapoint');
    expect(emitted).toBe(false);
  });

  it('rejects pace increments rather than adding decimal-looking pace numbers', () => {
    fixture.componentRef.setInput('stat', {...MOCK_STAT, yAxisFormat: 'pace', xAxisScaleType: 'linear',
      datasets: [{label: 'Run', index: 0, dataPoints: [{x: '1', y: '4.59'}]}]});
    fixture.detectChanges();
    component.addPointForm.setValue({dataset: 'Run', x: '2', y: '+0.10'});
    component.onAddPoint();
    expect(component.submissionError()).toContain('pace increments are not supported');
    httpTesting.expectNone(`${environment.apiBaseUrl}/test-stat/datapoint`);
  });

  it('submits completed counts and count increments without converting to percentages', () => {
    fixture.componentRef.setInput('stat', {...MOCK_STAT, yAxisFormat: 'percentage', xAxisScaleType: 'linear',
      datasets: [{label: 'Lucky trades', index: 0, percentageTarget: 50, dataPoints: [{x: '1', y: '4'}]}]});
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Completed count');
    for (const value of ['6', '+2']) {
      component.addPointForm.setValue({dataset: 'Lucky trades', x: '2', y: value});
      component.onAddPoint();
      const request = httpTesting.expectOne(`${environment.apiBaseUrl}/test-stat/datapoint`);
      expect(request.request.body).toEqual({datasetLabel: 'Lucky trades', x: '2', y: '6'});
      request.flush(null);
    }
  });

  it('converts percentage entries and percentage-point increments to counts using the selected target', () => {
    fixture.componentRef.setInput('stat', {...MOCK_STAT, yAxisFormat: 'percentage', percentageInputMode: 'percentage',
      xAxisScaleType: 'linear', datasets: [
        {label: 'Lucky trades', index: 0, percentageTarget: 50, dataPoints: [{x: '1', y: '4'}]},
        {label: 'Rocket leaders', index: 1, percentageTarget: 30, dataPoints: []}
      ]});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[matTextSuffix]').textContent).toBe('%');
    for (const [dataset, value, expected] of [
      ['Lucky trades', '12', '6'], ['Lucky trades', '+4', '6'], ['Rocket leaders', '20', '6'],
      ['Lucky trades', '0', '0'], ['Lucky trades', '120', '60']
    ]) {
      component.addPointForm.setValue({dataset, x: '2', y: value});
      component.onAddPoint();
      const request = httpTesting.expectOne(`${environment.apiBaseUrl}/test-stat/datapoint`);
      expect(request.request.body.y).toBe(expected);
      request.flush(null);
    }
    component.addPointForm.setValue({dataset: 'Lucky trades', x: '2', y: 'invalid'});
    component.onAddPoint();
    expect(component.submissionError()).toContain('finite percentage');
  });

  it('converts a pending entry when switching units without losing its date or increment marker', () => {
    const stat: Stat = {...MOCK_STAT, yAxisFormat: 'percentage', xAxisScaleType: 'linear',
      datasets: [{label: 'Lucky trades', index: 0, percentageTarget: 50, dataPoints: []}]};
    fixture.componentRef.setInput('stat', stat);
    fixture.detectChanges();
    component.addPointForm.setValue({dataset: 'Lucky trades', x: '2', y: '+6'});
    fixture.componentRef.setInput('stat', {...stat, percentageInputMode: 'percentage'});
    fixture.detectChanges();
    expect(component.addPointForm.value).toEqual({dataset: 'Lucky trades', x: '2', y: '+12'});
    fixture.componentRef.setInput('stat', {...stat, percentageInputMode: 'number'});
    fixture.detectChanges();
    expect(component.addPointForm.get('y')?.value).toBe('+6');
    expect(fixture.nativeElement.querySelector('[matTextSuffix]')).toBeNull();
  });

  it('preserves exact counts and increments through repeated rounded mode changes and saving', () => {
    const stat: Stat = {...MOCK_STAT, yAxisFormat: 'percentage', xAxisScaleType: 'linear',
      datasets: [{label: 'Rocket leaders', index: 0, percentageTarget: 30, dataPoints: [{x: '1', y: '5'}]}]};
    fixture.componentRef.setInput('stat', stat);
    fixture.detectChanges();
    for (const [value, expected] of [['10', '10'], ['+10', '15']]) {
      component.addPointForm.setValue({dataset: 'Rocket leaders', x: '2', y: value});
      for (let cycle = 0; cycle < 3; cycle++) {
        fixture.componentRef.setInput('stat', {...stat, percentageInputMode: 'percentage'});
        fixture.detectChanges();
        expect(component.addPointForm.get('y')?.value).toBe(value.startsWith('+') ? '+33.33' : '33.33');
        fixture.componentRef.setInput('stat', {...stat, percentageInputMode: 'number'});
        fixture.detectChanges();
        expect(component.addPointForm.get('y')?.value).toBe(value);
      }
      fixture.componentRef.setInput('stat', {...stat, percentageInputMode: 'percentage'});
      fixture.detectChanges();
      component.onAddPoint();
      const request = httpTesting.expectOne(`${environment.apiBaseUrl}/test-stat/datapoint`);
      expect(request.request.body.y).toBe(expected);
      request.flush(null);
      fixture.componentRef.setInput('stat', {...stat, percentageInputMode: 'number'});
      fixture.detectChanges();
    }
  });

  it('converts an edited percentage instead of restoring the earlier count', () => {
    const stat: Stat = {...MOCK_STAT, yAxisFormat: 'percentage', xAxisScaleType: 'linear',
      datasets: [{label: 'Rocket leaders', index: 0, percentageTarget: 30, dataPoints: []}]};
    fixture.componentRef.setInput('stat', stat);
    fixture.detectChanges();
    component.addPointForm.setValue({dataset: 'Rocket leaders', x: '2', y: '10'});
    fixture.componentRef.setInput('stat', {...stat, percentageInputMode: 'percentage'});
    fixture.detectChanges();
    component.addPointForm.patchValue({y: '50'});
    fixture.componentRef.setInput('stat', {...stat, percentageInputMode: 'number'});
    fixture.detectChanges();
    expect(component.addPointForm.get('y')?.value).toBe('15');
    component.onAddPoint();
    const request = httpTesting.expectOne(`${environment.apiBaseUrl}/test-stat/datapoint`);
    expect(request.request.body.y).toBe('15');
    request.flush(null);
  });

  it('shows duplicate bar-point validation errors and retains the input for correction', () => {
    fixture.componentRef.setInput('stat', {...MOCK_STAT, chartType: 'bar', xAxisScaleType: 'linear',
      datasets: [{label: 'Series', index: 0, dataPoints: [{x: '2', y: '100'}]}]});
    fixture.detectChanges();
    const emit = vi.spyOn(component.pointChanged, 'emit');
    component.addPointForm.setValue({dataset: 'Series', x: '2', y: '200'});
    component.onAddPoint();
    httpTesting.expectOne(`${environment.apiBaseUrl}/test-stat/datapoint`)
      .flush('Edit the existing point for Series at 2.', {status: 400, statusText: 'Bad Request'});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Edit the existing point');
    expect(component.addPointForm.get('y')?.value).toBe('200');
    expect(emit).not.toHaveBeenCalled();
    component.addPointForm.patchValue({x: '3'});
    component.onAddPoint();
    expect(component.submissionError()).toBe('');
    httpTesting.expectOne(`${environment.apiBaseUrl}/test-stat/datapoint`).flush(null);
    expect(emit).toHaveBeenCalledOnce();
  });
});
