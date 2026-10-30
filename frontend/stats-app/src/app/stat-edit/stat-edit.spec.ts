import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatEdit } from './stat-edit';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter, ActivatedRoute, convertToParamMap} from '@angular/router';
import {of} from 'rxjs';
import {Title} from '@angular/platform-browser';
import {environment} from '../../environments/environment';
import {Stat} from '../models/stat';

describe('StatEdit', () => {
  let component: StatEdit;
  let fixture: ComponentFixture<StatEdit>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatEdit],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({}))
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(StatEdit);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const stat: Stat = {id: 'weight', title: 'weight', xAxisName: 'Date', yAxisName: 'kg',
    reverse: false, smoothing: true, datasets: []};

  it('renames the graph, trims input and updates the page title without changing its ID', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set(stat);
    component.titleForm.setValue({title: '  Weight  '});
    component.renameGraph();
    expect(component.renaming()).toBe(true);
    component.renameGraph();
    const request = http.expectOne(`${environment.apiBaseUrl}/weight/title`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({title: 'Weight'});
    request.flush(null);
    expect(component.stat()).toEqual({...stat, title: 'Weight'});
    expect(component.titleForm.controls.title.value).toBe('Weight');
    expect(TestBed.inject(Title).getTitle()).toBe('StatsApp - Edit Weight');
    expect(component.renaming()).toBe(false);
    expect(component.renameSaved()).toBe(true);
    http.verify();
  });

  it('does not send blank or unchanged titles', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set(stat);
    for (const title of ['', '   ', 'weight']) {
      component.titleForm.setValue({title});
      component.renameGraph();
    }
    http.expectNone(`${environment.apiBaseUrl}/weight/title`);
    expect(component.stat()?.title).toBe('weight');
    http.verify();
  });

  it('retains the original title and entered name when saving fails, allowing retry', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set(stat);
    component.titleForm.setValue({title: 'Weight'});
    component.renameGraph();
    http.expectOne(`${environment.apiBaseUrl}/weight/title`).flush('Failed', {status: 500, statusText: 'Error'});
    expect(component.stat()?.title).toBe('weight');
    expect(component.titleForm.controls.title.value).toBe('Weight');
    expect(component.titleForm.enabled).toBe(true);
    expect(component.renameError()).toContain('Could not rename');
    component.renameGraph();
    http.expectOne(`${environment.apiBaseUrl}/weight/title`).flush(null);
    expect(component.stat()?.title).toBe('Weight');
    expect(component.renameError()).toBe('');
    http.verify();
  });
});
