import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ManageDatasetsForm} from './manage-datasets-form';
import {environment} from '../../../environments/environment';
import {Stat} from '../../models/stat';

describe('ManageDatasetsForm smoothing window', () => {
  const stat: Stat = {id: 'chart', title: 'Chart', xAxisName: 'X', yAxisName: 'Y', reverse: false,
    datasets: [{label: 'Series', index: 0, smoothing: true, dataPoints: []}]};

  it('shows the slider value while dragging, saves on release and restores it on failure', async () => {
    await TestBed.configureTestingModule({imports: [ManageDatasetsForm],
      providers: [provideHttpClient(), provideHttpClientTesting()]}).compileComponents();
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ManageDatasetsForm);
    fixture.componentRef.setInput('stat', stat);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type=range]');
    expect(input.value).toBe('7');
    expect(input.min).toBe('1');
    expect(input.max).toBe('100');
    expect(fixture.nativeElement.textContent).toContain('Smooth');
    input.value = '3';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('3 measurements');
    http.expectNone(`${environment.apiBaseUrl}/chart/dataset/Series/smoothing-window`);
    input.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(input.disabled).toBe(true);
    const request = http.expectOne(`${environment.apiBaseUrl}/chart/dataset/Series/smoothing-window`);
    expect(request.request.body).toEqual({smoothingWindow: 3});
    request.flush('failed', {status: 500, statusText: 'Error'});
    fixture.detectChanges();
    expect(input.value).toBe('7');
    expect(fixture.nativeElement.textContent).toContain('7 measurements');
    expect(fixture.componentInstance.smoothingWindowErrors()['Series']).toContain('Could not save');
    const changed = vi.spyOn(fixture.componentInstance.datasetsChanged, 'emit');
    input.value = '3';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('change'));
    http.expectOne(`${environment.apiBaseUrl}/chart/dataset/Series/smoothing-window`).flush(null);
    expect(changed).toHaveBeenCalledOnce();
    http.verify();
    fixture.destroy();
  });

  it('preserves a previously saved window beyond the standard slider range', async () => {
    await TestBed.configureTestingModule({imports: [ManageDatasetsForm],
      providers: [provideHttpClient(), provideHttpClientTesting()]}).compileComponents();
    const fixture = TestBed.createComponent(ManageDatasetsForm);
    fixture.componentRef.setInput('stat', {...stat, datasets: [{...stat.datasets[0], smoothingWindow: 150}]});
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type=range]');
    expect(input.max).toBe('150');
    expect(input.value).toBe('150');
    expect(fixture.nativeElement.textContent).toContain('150 measurements');
    fixture.destroy();
  });

  it('groups axis fields and saves their values together', async () => {
    await TestBed.configureTestingModule({imports: [ManageDatasetsForm],
      providers: [provideHttpClient(), provideHttpClientTesting()]}).compileComponents();
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ManageDatasetsForm);
    fixture.componentRef.setInput('stat', stat);
    fixture.detectChanges();
    const sections: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.axis-section');
    expect(sections[0].querySelector('[formControlName="xAxisName"]')).toBeTruthy();
    expect(sections[0].querySelector('[formControlName="xAxisScaleType"]')).toBeTruthy();
    expect(sections[0].querySelector('[formControlName="xAxisUnit"]')).toBeTruthy();
    expect(sections[1].querySelector('[formControlName="yAxisName"]')).toBeTruthy();
    fixture.componentInstance.axesForm.setValue({xAxisName: 'Distance', yAxisName: 'Speed',
      xAxisScaleType: 'linear', xAxisUnit: 'km'});
    fixture.componentInstance.onRenameAxes();
    const request = http.expectOne(`${environment.apiBaseUrl}/chart/axes`);
    expect(request.request.body).toEqual({xAxisName: 'Distance', yAxisName: 'Speed',
      xAxisScaleType: 'linear', xAxisUnit: 'km'});
    request.flush(null);
    http.verify();
    fixture.destroy();
  });

  it('saves gap filling and restores the checkbox if saving fails', async () => {
    await TestBed.configureTestingModule({imports: [ManageDatasetsForm],
      providers: [provideHttpClient(), provideHttpClientTesting()]}).compileComponents();
    const http = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ManageDatasetsForm);
    fixture.componentRef.setInput('stat', stat);
    fixture.detectChanges();
    const checkbox: HTMLElement = Array.from(fixture.nativeElement.querySelectorAll('mat-checkbox'))
      .find((element): element is HTMLElement => element instanceof HTMLElement && element.textContent!.includes('Fill gaps'))!;
    const input = checkbox.querySelector('input')!;
    expect(input.checked).toBe(false);
    input.click();
    fixture.detectChanges();
    expect(input.disabled).toBe(true);
    const request = http.expectOne(`${environment.apiBaseUrl}/chart/dataset/Series/interpolate-gaps`);
    expect(request.request.body).toEqual({interpolateGaps: true});
    request.flush('failed', {status: 500, statusText: 'Error'});
    fixture.detectChanges();
    expect(input.checked).toBe(false);
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain('Could not save gap filling');
    input.click();
    http.expectOne(`${environment.apiBaseUrl}/chart/dataset/Series/interpolate-gaps`).flush(null);
    expect(fixture.componentInstance.interpolateGapsErrors()['Series']).toBeUndefined();
    http.verify();
    fixture.destroy();
  });

  it('only offers gap filling for smoothed date datasets', async () => {
    await TestBed.configureTestingModule({imports: [ManageDatasetsForm],
      providers: [provideHttpClient(), provideHttpClientTesting()]}).compileComponents();
    const fixture = TestBed.createComponent(ManageDatasetsForm);
    for (const settings of [
      {xAxisScaleType: 'linear' as const, smoothing: true},
      {xAxisScaleType: 'time' as const, smoothing: false}
    ]) {
      fixture.componentRef.setInput('stat', {...stat, xAxisScaleType: settings.xAxisScaleType,
        datasets: [{...stat.datasets[0], smoothing: settings.smoothing}]});
      fixture.detectChanges();
      expect(fixture.nativeElement.textContent).not.toContain('Fill gaps');
    }
    fixture.destroy();
  });
});
