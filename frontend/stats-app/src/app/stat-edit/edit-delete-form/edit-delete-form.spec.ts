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
});
