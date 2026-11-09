import {Component, EventEmitter, Input, Output} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {By} from '@angular/platform-browser';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ActivatedRoute, convertToParamMap, provideRouter, Router} from '@angular/router';
import {provideLuxonDateAdapter} from '@angular/material-luxon-adapter';
import {of} from 'rxjs';
import {StatData} from './stat-data';
import {Stat} from '../models/stat';
import {ChartComponent, ChartPointClickEvent} from '../chart/chart';
import {ManageDatasetsForm} from '../stat-edit/manage-datasets-form/manage-datasets-form';
import {AddPointForm} from '../stat-edit/add-point-form/add-point-form';
import {EditDeleteForm} from '../stat-edit/edit-delete-form/edit-delete-form';
import {environment} from '../../environments/environment';
import {routes} from '../app.routes';

@Component({selector: 'app-chart', template: ''})
class ChartStub {
  @Input() stat!: Stat;
  @Output() pointClick = new EventEmitter<ChartPointClickEvent>();
}

describe('StatData', () => {
  let fixture: ComponentFixture<StatData>;
  let component: StatData;
  let http: HttpTestingController;
  const point = {x: '2026-11-09', y: '70'};
  const stat: Stat = {id: 'weight', title: 'Weight', xAxisName: 'Date', yAxisName: 'kg',
    reverse: false, datasets: [{label: 'Weight', index: 0, dataPoints: [point]}]};

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatData],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter(routes),
        provideLuxonDateAdapter(),
        {provide: ActivatedRoute, useValue: {paramMap: of(convertToParamMap({id: 'weight'}))}}]
    }).overrideComponent(StatData, {
      remove: {imports: [ChartComponent]}, add: {imports: [ChartStub]}
    }).compileComponents();
    fixture = TestBed.createComponent(StatData);
    component = fixture.componentInstance;
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function load(archived = false): void {
    http.expectOne(`${environment.apiBaseUrl}/weight`).flush(stat);
    http.expectOne(`${environment.apiBaseUrl}/weight/archived`).flush(archived);
    fixture.detectChanges();
  }

  async function selectTab(index: number): Promise<void> {
    const tabs = fixture.nativeElement.querySelectorAll('mat-tab-header [role="tab"]');
    (tabs[index] as HTMLElement).click();
    await fixture.whenStable();
    const selectors = ['app-manage-datasets-form', 'app-add-point-form', 'app-edit-delete-form'];
    await vi.waitFor(() => {
      fixture.detectChanges();
      expect(fixture.nativeElement.querySelector(selectors[index])).toBeTruthy();
    });
  }

  it('loads via its dedicated route, renders data tools only, and links to the chart and settings', async () => {
    load();
    expect(routes.find(route => route.path === 'stats/:id/data')?.component).toBe(StatData);
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelectorAll('mat-tab-header [role="tab"]')).toHaveLength(3);
    expect(page.querySelector('app-manage-datasets-form')).toBeTruthy();
    await selectTab(1);
    expect(page.querySelector('app-add-point-form')).toBeTruthy();
    await selectTab(2);
    expect(page.querySelector('app-edit-delete-form')).toBeTruthy();
    expect(page.querySelector('[aria-label="Chart display settings"], .rename-form')).toBeNull();
    expect(Array.from(page.querySelectorAll('nav a'), link => link.getAttribute('href')))
      .toEqual(['/stats/weight', '/stats/weight/edit']);
  });

  it('refreshes the saved data and preview after dataset, add-point and edit/delete changes', async () => {
    load();
    for (const index of [0, 1, 2]) {
      await selectTab(index);
      if (index === 0) {
        const form = fixture.debugElement.query(By.directive(ManageDatasetsForm)).componentInstance as ManageDatasetsForm;
        form.datasetsChanged.emit();
      } else if (index === 1) {
        const form = fixture.debugElement.query(By.directive(AddPointForm)).componentInstance as AddPointForm;
        form.pointChanged.emit();
      } else {
        const form = fixture.debugElement.query(By.directive(EditDeleteForm)).componentInstance as EditDeleteForm;
        form.pointChanged.emit();
      }
      const updated = {...stat, title: 'Updated'};
      http.expectOne(`${environment.apiBaseUrl}/weight`).flush(updated);
      fixture.detectChanges();
      const chart = fixture.debugElement.query(By.directive(ChartStub)).componentInstance as ChartStub;
      expect(chart.stat).toEqual(updated);
    }
  });

  it('opens the edit/delete tab and selects the original point when the chart is clicked', async () => {
    load();
    const chart = fixture.debugElement.query(By.directive(ChartStub)).componentInstance as ChartStub;
    chart.pointClick.emit({datasetLabel: 'Weight', point});
    fixture.detectChanges();
    await new Promise(resolve => setTimeout(resolve, 0));
    expect(component.tabGroup()?.selectedIndex).toBe(2);
    expect(component.editDeleteForm()?.editPointForm.value)
      .toMatchObject({dataset: 'Weight', selectedPoint: point, value: '70'});
  });

  it('redirects archived charts without rendering data editing tools', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    load(true);
    expect(navigate).toHaveBeenCalledWith(['/stats', 'weight']);
    expect(component.stat()).toBeUndefined();
    expect(fixture.nativeElement.querySelector('mat-tab-group')).toBeNull();
  });

  it('redirects missing charts to the normal view', () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    http.expectOne(`${environment.apiBaseUrl}/weight/archived`).flush(false);
    http.expectOne(`${environment.apiBaseUrl}/weight`).flush('Missing', {status: 404, statusText: 'Not Found'});
    expect(navigate).toHaveBeenCalledWith(['/stats', 'weight']);
    expect(component.stat()).toBeUndefined();
  });

  it('shows load and refresh failures explicitly', () => {
    http.expectOne(`${environment.apiBaseUrl}/weight/archived`).flush(false);
    http.expectOne(`${environment.apiBaseUrl}/weight`).flush('Failed', {status: 500, statusText: 'Error'});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Could not load');
    component.loadStatById('weight');
    load();
    component.reloadStat();
    http.expectOne(`${environment.apiBaseUrl}/weight`).flush('Failed', {status: 500, statusText: 'Error'});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('Could not refresh');
    expect(component.stat()).toEqual(stat);
  });
});
