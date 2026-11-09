import { ComponentFixture, TestBed } from '@angular/core/testing';

import { StatEdit } from './stat-edit';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {provideRouter, ActivatedRoute, convertToParamMap, Router} from '@angular/router';
import {of} from 'rxjs';
import {Title} from '@angular/platform-browser';
import {environment} from '../../environments/environment';
import {Stat} from '../models/stat';
import {Component, Input} from '@angular/core';
import {ChartComponent} from '../chart/chart';
import {provideLuxonDateAdapter} from '@angular/material-luxon-adapter';

@Component({selector: 'app-chart', template: ''})
class ChartStub {
  @Input() stat!: Stat;
}

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
        provideLuxonDateAdapter(),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of(convertToParamMap({}))
          }
        }
      ]
    }).overrideComponent(StatEdit, {
      remove: {imports: [ChartComponent]}, add: {imports: [ChartStub]}
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

  it('renders all display settings on the edit page and links back to this chart', async () => {
    component.stat.set(stat);
    fixture.detectChanges();
    await fixture.whenStable();
    const page: HTMLElement = fixture.nativeElement;
    const settings = page.querySelector('[aria-label="Chart display settings"]')!;
    expect(settings).toBeTruthy();
    expect(settings.querySelectorAll('mat-select')).toHaveLength(2);
    expect(settings.querySelectorAll('mat-slide-toggle')).toHaveLength(3);
    expect(page.querySelector('input[formControlName="yAxisMin"]')).toBeTruthy();
    expect(page.querySelector('input[formControlName="yAxisMax"]')).toBeTruthy();
    for (const name of ['yAxisMin', 'yAxisMax']) {
      const field = page.querySelector(`[formControlName="${name}"]`)!.closest('mat-form-field')!;
      expect(field.querySelector('.mat-mdc-form-field-required-marker')).toBeNull();
      expect(field.querySelector('mat-label')!.textContent).not.toContain('(optional)');
    }
    expect(page.querySelector('mat-tab-group, app-manage-datasets-form, app-add-point-form, app-edit-delete-form')).toBeNull();
    expect(page.querySelector('a[href="/stats/weight/data"]')?.textContent).toContain('Manage data');
    const back = page.querySelector<HTMLAnchorElement>('a');
    expect(back?.getAttribute('href')).toBe('/stats/weight');
    expect(back?.textContent).toContain('Back to chart');
    const router = TestBed.inject(Router);
    const navigate = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
    back!.click();
    expect(navigate).toHaveBeenCalled();
    expect(navigate.mock.calls[0][0].toString()).toBe('/stats/weight');
  });

  it('saves bounds entered in the edit form after blur and reflects them in the preview', () => {
    const http = TestBed.inject(HttpTestingController);
    component.stat.set(stat);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    const min = page.querySelector<HTMLInputElement>('input[formControlName="yAxisMin"]')!;
    const max = page.querySelector<HTMLInputElement>('input[formControlName="yAxisMax"]')!;
    for (const [input, value] of [[min, '-10'], [max, '100']] as const) {
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
    }
    const form = min.closest('form')!;
    form.dispatchEvent(new Event('submit', {bubbles: true, cancelable: true}));
    const request = http.expectOne(`${environment.apiBaseUrl}/weight/y-axis-bounds`);
    expect(request.request.body).toEqual({yAxisMin: -10, yAxisMax: 100});
    request.flush(null);
    expect(component.stat()).toMatchObject({yAxisMin: -10, yAxisMax: 100});
    http.verify();
  });

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
