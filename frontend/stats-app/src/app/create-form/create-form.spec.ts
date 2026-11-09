import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CreateForm } from './create-form';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter, Router} from '@angular/router';
import {environment} from '../../environments/environment';

describe('CreateForm', () => {
  let component: CreateForm;
  let fixture: ComponentFixture<CreateForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CreateForm],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(CreateForm);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('marks required axis fields with an asterisk and leaves optional axis fields unmarked', () => {
    const page: HTMLElement = fixture.nativeElement;
    for (const name of ['xAxisName', 'yAxisName', 'xAxisScaleType']) {
      const field = page.querySelector(`[formControlName="${name}"]`)!.closest('mat-form-field')!;
      expect(field.querySelector('.mat-mdc-form-field-required-marker')).toBeTruthy();
    }
    for (const name of ['xAxisUnit', 'yAxisMin', 'yAxisMax']) {
      const field = page.querySelector(`[formControlName="${name}"]`)!.closest('mat-form-field')!;
      expect(field.querySelector('.mat-mdc-form-field-required-marker')).toBeNull();
      expect(field.querySelector('mat-label')!.textContent).not.toContain('(optional)');
    }
  });

  it('shows the pace bounds hint only when pace format is selected', async () => {
    const hint = () => fixture.nativeElement.querySelector('.pace-bounds-hint');
    expect(hint()).toBeNull();
    component.statForm.patchValue({yAxisFormat: 'pace'});
    fixture.detectChanges();
    expect(hint()?.textContent).toContain('300 = 5:00');
    component.statForm.patchValue({yAxisFormat: 'number'});
    fixture.detectChanges();
    expect(hint()).toBeNull();
  });

  it('creates a chart with the selected stacking setting before datasets are added', () => {
    const http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(component.statForm.get('stacked')?.value).toBe(false);
    expect(component.statForm.get('yAxisMin')?.value).toBeNull();
    expect(component.statForm.get('yAxisMax')?.value).toBeNull();
    component.statForm.setValue({
      id: 'cumulus', title: 'Cumulus points', chartType: 'line', xAxisName: 'Date', yAxisName: 'Points',
      reverse: false, stacked: true, yAxisMin: 0, yAxisMax: 600, xAxisScaleType: 'time', xAxisUnit: '',
      effortComparison: true, yAxisFormat: 'pace'
    });
    http.expectOne(`${environment.apiBaseUrl}/cumulus`).flush('Not found', {status: 404, statusText: 'Not Found'});
    fixture.debugElement.query(element => element.name === 'form').triggerEventHandler('ngSubmit');
    const request = http.expectOne(environment.apiBaseUrl);
    expect(request.request.body.stacked).toBe(true);
    expect(request.request.body.yAxisMin).toBe(0);
    expect(request.request.body.yAxisMax).toBe(600);
    expect(request.request.body.effortComparison).toBe(true);
    expect(request.request.body.yAxisFormat).toBe('pace');
    expect(request.request.body.datasets).toEqual([]);
    request.flush(null);
    http.verify();
  });

  it('creates a bar chart with stacking and automatic bounds by default', () => {
    const http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(component.statForm.get('chartType')?.value).toBe('line');
    component.statForm.patchValue({id: 'weekly', title: 'Weekly', chartType: 'bar', xAxisName: 'Date', yAxisName: 'Checks'});
    component.onChartTypeChange('bar');
    http.expectOne(`${environment.apiBaseUrl}/weekly`).flush('Not found', {status: 404, statusText: 'Not Found'});
    fixture.debugElement.query(element => element.name === 'form').triggerEventHandler('ngSubmit');
    const request = http.expectOne(environment.apiBaseUrl);
    expect(request.request.body).toMatchObject({chartType: 'bar', stacked: true, yAxisMin: null, yAxisMax: null, datasets: []});
    request.flush(null);
    http.verify();
  });

  it('does not replace explicitly chosen display settings when selecting bar', () => {
    component.statForm.get('stacked')!.markAsDirty();
    component.statForm.patchValue({yAxisMin: -10, yAxisMax: 20});
    component.onChartTypeChange('bar');
    expect(component.statForm.get('stacked')?.value).toBe(false);
    expect(component.statForm.get('yAxisMin')?.value).toBe(-10);
    expect(component.statForm.get('yAxisMax')?.value).toBe(20);
  });

  it('validates finite ordered bounds while allowing zero, negative and one-sided bounds', () => {
    for (const [yAxisMin, yAxisMax] of [[5, 5], [10, 5], [NaN, null], [null, Infinity]]) {
      component.statForm.patchValue({yAxisMin, yAxisMax});
      expect(component.statForm.errors?.['yAxisBounds']).toBeTruthy();
    }
    for (const [yAxisMin, yAxisMax] of [[null, null], [0, null], [null, -5], [-10, 0]]) {
      component.statForm.patchValue({yAxisMin, yAxisMax});
      expect(component.statForm.errors).toBeNull();
    }
  });
});
