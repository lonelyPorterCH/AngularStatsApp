import {ComponentFixture, TestBed} from '@angular/core/testing';
import {StatDetails} from './stat-details';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ActivatedRoute, convertToParamMap, provideRouter} from '@angular/router';
import {of} from 'rxjs';
import {environment} from '../../environments/environment';
import {Stat} from '../models/stat';
import {ChartComponent} from '../chart/chart';
import {Component, Input} from '@angular/core';

@Component({selector: 'app-chart', template: ''})
class ChartStub {
  @Input() stat!: Stat;
}

describe('StatDetails', () => {
  let component: StatDetails;
  let fixture: ComponentFixture<StatDetails>;
  const stat: Stat = {id: 'weight', title: 'Weight', xAxisName: 'Date', yAxisName: 'kg',
    reverse: false, datasets: []};

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatDetails],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        {provide: ActivatedRoute, useValue: {paramMap: of(convertToParamMap({}))}}]
    }).overrideComponent(StatDetails, {
      remove: {imports: [ChartComponent]}, add: {imports: [ChartStub]}
    }).compileComponents();
    fixture = TestBed.createComponent(StatDetails);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('shows the chart and edit navigation without settings controls', () => {
    component.stat.set(stat);
    fixture.detectChanges();
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('app-chart')).toBeTruthy();
    expect(page.querySelector('form, mat-select, mat-slide-toggle, input')).toBeNull();
    expect(page.querySelector('button[disabled]')).toBeNull();
    expect(page.textContent).toContain('Edit');
    expect(page.textContent).toContain('Manage data');
  });

  it('loads saved chart settings for rendering and disables editing archived charts', () => {
    const http = TestBed.inject(HttpTestingController);
    component.loadStatById('weight');
    http.expectOne(`${environment.apiBaseUrl}/weight`).flush({...stat, yAxisMin: 0, stacked: true});
    http.expectOne(`${environment.apiBaseUrl}/weight/archived`).flush(true);
    fixture.detectChanges();
    expect(component.stat()?.yAxisMin).toBe(0);
    expect(component.stat()?.stacked).toBe(true);
    const page: HTMLElement = fixture.nativeElement;
    expect(page.querySelector('button[disabled]')?.textContent).toContain('Edit');
    expect(Array.from(page.querySelectorAll('button[disabled]'), button => button.textContent)
      .some(text => text?.includes('Manage data'))).toBe(true);
    expect(page.querySelector('form, mat-select, mat-slide-toggle, input')).toBeNull();
    http.verify();
  });
});
