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

  it('creates a chart with the selected stacking setting before datasets are added', () => {
    const http = TestBed.inject(HttpTestingController);
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    expect(component.statForm.get('stacked')?.value).toBe(false);
    expect(component.statForm.get('includeZero')?.value).toBe(false);
    component.statForm.setValue({
      id: 'cumulus', title: 'Cumulus points', xAxisName: 'Date', yAxisName: 'Points',
      reverse: false, stacked: true, includeZero: true, xAxisScaleType: 'time', xAxisUnit: ''
    });
    http.expectOne(`${environment.apiBaseUrl}/cumulus`).flush('Not found', {status: 404, statusText: 'Not Found'});
    fixture.debugElement.query(element => element.name === 'form').triggerEventHandler('ngSubmit');
    const request = http.expectOne(environment.apiBaseUrl);
    expect(request.request.body.stacked).toBe(true);
    expect(request.request.body.includeZero).toBe(true);
    expect(request.request.body.datasets).toEqual([]);
    request.flush(null);
    http.verify();
  });
});
