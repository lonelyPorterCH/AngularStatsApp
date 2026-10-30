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
