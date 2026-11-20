import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditDeleteForm } from './edit-delete-form';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {Stat} from '../../models/stat';
import {environment} from '../../../environments/environment';

describe('EditDeleteForm', () => {
  let component: EditDeleteForm;
  let fixture: ComponentFixture<EditDeleteForm>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditDeleteForm],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    }).compileComponents();

    fixture = TestBed.createComponent(EditDeleteForm);
    component = fixture.componentInstance;
    component.stat = {id: 'runs', title: 'Runs', xAxisName: 'Date', yAxisName: 'Pace',
      reverse: true, yAxisFormat: 'pace', datasets: [
        {label: 'Run', index: 0, dataPoints: [{x: '2026-11-01', y: '4.59'}]}
      ]} satisfies Stat;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('disables point and value controls until the dataset and point are selected', () => {
    const stat: Stat = {...component.stat, datasets: [
      ...component.stat.datasets,
      {label: 'Other', index: 1, dataPoints: [{x: '2026-11-02', y: '120'}]}
    ]};
    fixture.componentRef.setInput('stat', stat);
    fixture.detectChanges();
    component.editPointForm.reset();
    fixture.detectChanges();
    const pointSelect: HTMLElement = fixture.nativeElement.querySelector('mat-select[formControlName="selectedPoint"]');
    const valueInput: HTMLInputElement = fixture.nativeElement.querySelector('input[formControlName="value"]');
    expect(pointSelect.getAttribute('aria-disabled')).toBe('true');
    expect(valueInput.disabled).toBe(true);
    component.editPointForm.patchValue({dataset: 'Other'});
    fixture.detectChanges();
    expect(pointSelect.getAttribute('aria-disabled')).toBe('false');
    expect(valueInput.disabled).toBe(true);
    component.editPointForm.patchValue({selectedPoint: stat.datasets[1].dataPoints[0]});
    fixture.detectChanges();
    expect(valueInput.disabled).toBe(false);
    TestBed.inject(HttpTestingController).verify();
  });

  it('rejects invalid pace before deleting the original measurement', () => {
    component.prefillPoint('Run', component.stat.datasets[0].dataPoints[0]);
    component.editPointForm.patchValue({value: '5:60'});
    component.onEditPoint();
    expect(component.submissionError()).toContain('seconds between');
    TestBed.inject(HttpTestingController).verify();
  });

  it('allows editing pace as m:ss while retaining the original value for deletion', () => {
    const http = TestBed.inject(HttpTestingController);
    component.prefillPoint('Run', component.stat.datasets[0].dataPoints[0]);
    component.editPointForm.patchValue({value: '5:09'});
    component.onEditPoint();
    const deletion = http.expectOne(`${environment.apiBaseUrl}/runs/datapoint`);
    expect(deletion.request.method).toBe('DELETE');
    expect(deletion.request.body.y).toBe('4.59');
    deletion.flush(null);
    const addition = http.expectOne(`${environment.apiBaseUrl}/runs/datapoint`);
    expect(addition.request.method).toBe('POST');
    expect(addition.request.body.y).toBe('5:09');
    addition.flush(null);
    http.verify();
  });

  it('prefills percentage values from stored counts and saves counts while deleting by the original value', () => {
    const http = TestBed.inject(HttpTestingController);
    const stat: Stat = {...component.stat, yAxisFormat: 'percentage', percentageInputMode: 'percentage', datasets: [
      {label: 'Lucky trades', index: 0, percentageTarget: 50, dataPoints: [{x: '2026-11-16', y: '6'}]}
    ]};
    fixture.componentRef.setInput('stat', stat);
    fixture.detectChanges();
    for (const value of [20, 0]) {
      component.prefillPoint('Lucky trades', stat.datasets[0].dataPoints[0]);
      expect(component.editPointForm.get('value')?.value).toBe('12');
      expect(fixture.nativeElement.querySelector('[matTextSuffix]').textContent).toBe('%');
      component.editPointForm.patchValue({value});
      component.onEditPoint();
      const deletion = http.expectOne(`${environment.apiBaseUrl}/runs/datapoint`);
      expect(deletion.request.method).toBe('DELETE');
      expect(deletion.request.body.y).toBe('6');
      deletion.flush(null);
      const addition = http.expectOne(`${environment.apiBaseUrl}/runs/datapoint`);
      expect(addition.request.body.y).toBe(value === 20 ? '10' : '0');
      addition.flush(null);
    }
    http.verify();
  });

  it('does not rewrite an unchanged count due to percentage conversion rounding', () => {
    const http = TestBed.inject(HttpTestingController);
    const stat: Stat = {...component.stat, yAxisFormat: 'percentage', percentageInputMode: 'percentage', datasets: [
      {label: 'Rocket leaders', index: 0, percentageTarget: 30, dataPoints: [{x: '2026-11-16', y: '7'}]}
    ]};
    fixture.componentRef.setInput('stat', stat);
    fixture.detectChanges();
    component.prefillPoint('Rocket leaders', stat.datasets[0].dataPoints[0]);
    component.onEditPoint();
    http.expectOne(`${environment.apiBaseUrl}/runs/datapoint`).flush(null);
    const addition = http.expectOne(`${environment.apiBaseUrl}/runs/datapoint`);
    expect(addition.request.body.y).toBe('7');
    addition.flush(null);
    http.verify();
  });

  it('rounds prefilled percentages and preserves an edited count through switching and saving', () => {
    const http = TestBed.inject(HttpTestingController);
    const stat: Stat = {...component.stat, yAxisFormat: 'percentage', percentageInputMode: 'percentage', datasets: [
      {label: 'Rocket leaders', index: 0, percentageTarget: 30, dataPoints: [{x: '2026-11-16', y: '10'}]}
    ]};
    fixture.componentRef.setInput('stat', stat);
    fixture.detectChanges();
    const point = stat.datasets[0].dataPoints[0];
    component.prefillPoint('Rocket leaders', point);
    expect(component.editPointForm.get('value')?.value).toBe('33.33');
    expect(component.pointInputValue(point)).toBe('33.33');
    fixture.componentRef.setInput('stat', {...stat, percentageInputMode: 'number'});
    fixture.detectChanges();
    expect(component.editPointForm.get('value')?.value).toBe('10');
    component.editPointForm.patchValue({value: 11});
    for (let cycle = 0; cycle < 3; cycle++) {
      fixture.componentRef.setInput('stat', {...stat, percentageInputMode: 'percentage'});
      fixture.detectChanges();
      expect(component.editPointForm.get('value')?.value).toBe('36.67');
      fixture.componentRef.setInput('stat', {...stat, percentageInputMode: 'number'});
      fixture.detectChanges();
      expect(component.editPointForm.get('value')?.value).toBe('11');
    }
    fixture.componentRef.setInput('stat', {...stat, percentageInputMode: 'percentage'});
    fixture.detectChanges();
    component.onEditPoint();
    const deletion = http.expectOne(`${environment.apiBaseUrl}/runs/datapoint`);
    expect(deletion.request.body.y).toBe('10');
    deletion.flush(null);
    const addition = http.expectOne(`${environment.apiBaseUrl}/runs/datapoint`);
    expect(addition.request.body.y).toBe('11');
    addition.flush(null);
    http.verify();
  });

  it('converts an in-progress edit on mode changes without clearing the selected point', () => {
    const stat: Stat = {...component.stat, yAxisFormat: 'percentage', datasets: [
      {label: 'Lucky trades', index: 0, percentageTarget: 50, dataPoints: [{x: '2026-11-16', y: '6'}]}
    ]};
    fixture.componentRef.setInput('stat', stat);
    fixture.detectChanges();
    component.prefillPoint('Lucky trades', stat.datasets[0].dataPoints[0]);
    component.editPointForm.patchValue({value: 8});
    fixture.componentRef.setInput('stat', {...stat, percentageInputMode: 'percentage'});
    fixture.detectChanges();
    expect(component.editPointForm.value).toMatchObject({selectedPoint: stat.datasets[0].dataPoints[0], value: '16'});
    fixture.componentRef.setInput('stat', {...stat, percentageInputMode: 'number'});
    fixture.detectChanges();
    expect(component.editPointForm.get('value')?.value).toBe('8');
    TestBed.inject(HttpTestingController).verify();
  });

  it('edits percentage-chart counts including zero without treating zero as deletion', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat = {...component.stat, yAxisFormat: 'percentage', datasets: [
      {label: 'Lucky trades', index: 0, percentageTarget: 50, dataPoints: [{x: '2026-11-16', y: '4'}]}
    ]};
    for (const value of [6, 0]) {
      component.prefillPoint('Lucky trades', component.stat.datasets[0].dataPoints[0]);
      component.editPointForm.patchValue({value});
      component.onEditPoint();
      const deletion = http.expectOne(`${environment.apiBaseUrl}/runs/datapoint`);
      expect(deletion.request.method).toBe('DELETE');
      expect(deletion.request.body.y).toBe('4');
      deletion.flush(null);
      const addition = http.expectOne(`${environment.apiBaseUrl}/runs/datapoint`);
      expect(addition.request.method).toBe('POST');
      expect(addition.request.body.y).toBe(String(value));
      addition.flush(null);
    }
    http.verify();
  });
});
