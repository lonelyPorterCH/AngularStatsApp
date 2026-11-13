import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
import {By} from '@angular/platform-browser';
import {MatDatepicker} from '@angular/material/datepicker';
import {DateTime} from 'luxon';
import {of, throwError} from 'rxjs';
import {CsvImport} from './csv-import';
import {StatService} from '../services/stat-service';
import {parseCsv} from './csv-mapper';

describe('CsvImport', () => {
  const service = {getStatById: vi.fn(), addStat: vi.fn()};
  let component: CsvImport;

  beforeEach(() => {
    vi.resetAllMocks();
    service.getStatById.mockImplementation(() => throwError(() => new HttpErrorResponse({status: 404})));
    service.addStat.mockReturnValue(of(null));
    TestBed.configureTestingModule({imports: [CsvImport], providers: [provideRouter([]), {provide: StatService, useValue: service}]});
    component = TestBed.createComponent(CsvImport).componentInstance;
    component.table.set(parseCsv('Date,Weight (kg),Fat (kg)\n2026-10-30,64,8.8'));
    component.fileName.set('measurements.csv');
    component.selected.set([1, 2]);
  });

  it('renders the column mapping and preview', () => {
    const fixture = TestBed.createComponent(CsvImport);
    fixture.componentInstance.table.set(component.table());
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Weight (kg)');
  });

  it('clears prepared graph details when mapping changes', () => {
    component.review();
    component.confirmed.set(true);
    component.toggleColumn(2, false);
    expect(component.prepared()).toBe(false);
    expect(component.confirmed()).toBe(false);
    expect(component.graphs.length).toBe(0);
  });

  it('resets mapping and confirmation when replacing a file', async () => {
    component.setDateFormat('yyyy-MM-dd');
    component.rangeForm.setValue({from: DateTime.fromISO('2026-01-01'), to: DateTime.fromISO('2026-12-31')});
    component.review();
    component.confirmed.set(true);
    const input = {files: [{name: 'new.csv', text: async () => 'Date,Other\n2026-10-30,1'}], value: 'old.csv'};
    await component.loadFile({target: input} as unknown as Event);
    expect(component.table()?.headers).toEqual(['Date', 'Other']);
    expect(component.selected()).toEqual([]);
    expect(component.dateFormat()).toBe('');
    expect(component.dateRange()).toEqual({from: '', to: ''});
    expect(component.prepared()).toBe(false);
    expect(component.confirmed()).toBe(false);
    expect(input.value).toBe('');
  });

  it('updates preview and saved points when a custom date format is entered', async () => {
    const fixture = TestBed.createComponent(CsvImport);
    const instance = fixture.componentInstance;
    instance.table.set(parseCsv('Date,Weight\n03/04/2026,64'));
    instance.selected.set([1]);
    fixture.detectChanges();
    expect(instance.canReview()).toBe(false);
    const input = fixture.nativeElement.querySelector('input[placeholder="e.g. dd.MM.yyyy"]') as HTMLInputElement;
    input.value = 'dd/MM/yyyy';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(instance.canReview()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('2026-04-03');
    instance.review();
    instance.confirmed.set(true);
    fixture.detectChanges();
    expect(input.disabled).toBe(true);
    await instance.save();
    expect(service.addStat.mock.calls[0][0].datasets[0].dataPoints).toEqual([{x: '2026-04-03', y: '64'}]);
  });

  it('clears confirmation and rebuilds the preview after changing the date format', () => {
    component.table.set(parseCsv('Date,Weight\n03/04/2026,64'));
    component.selected.set([1]);
    component.setDateFormat('dd/MM/yyyy');
    component.review();
    component.confirmed.set(true);
    component.setDateFormat('MM/dd/yyyy');
    expect(component.prepared()).toBe(false);
    expect(component.confirmed()).toBe(false);
    expect(component.graphs.length).toBe(0);
    expect(component.preview()?.datasets[0].dataPoints[0].x).toBe('2026-03-04');
  });

  it('uses the entered date range in both preview and saved data', async () => {
    const fixture = TestBed.createComponent(CsvImport);
    const instance = fixture.componentInstance;
    instance.table.set(parseCsv('Date,Weight\n31.12.2025,60\n01.01.2026 00:01,61\n31.12.2026 23:59,62\n01.01.2027,63'));
    instance.selected.set([1]);
    fixture.detectChanges();
    const from = fixture.nativeElement.querySelector('input[placeholder="01.01.2026"]') as HTMLInputElement;
    const to = fixture.nativeElement.querySelector('input[placeholder="31.12.2026"]') as HTMLInputElement;
    from.value = '01.01.2026';
    from.dispatchEvent(new Event('input'));
    from.dispatchEvent(new Event('blur'));
    to.value = '31.12.2026';
    to.dispatchEvent(new Event('input'));
    to.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('2 rows outside the date range');
    instance.review();
    instance.confirmed.set(true);
    fixture.detectChanges();
    expect(from.readOnly).toBe(true);
    expect(to.readOnly).toBe(true);
    await instance.save();
    expect(service.addStat.mock.calls[0][0].datasets[0].dataPoints).toEqual([
      {x: '2026-01-01', y: '61'}, {x: '2026-12-31', y: '62'}
    ]);
  });

  it('invalidates review when the date range changes and restores all rows when cleared', () => {
    component.review();
    component.confirmed.set(true);
    component.rangeForm.controls.from.setValue(DateTime.fromISO('2027-01-01'));
    expect(component.prepared()).toBe(false);
    expect(component.confirmed()).toBe(false);
    expect(component.graphs.length).toBe(0);
    expect(component.canReview()).toBe(false);
    component.review();
    expect(component.prepared()).toBe(false);
    component.rangeForm.controls.from.setValue(null);
    expect(component.canReview()).toBe(true);
    expect(component.preview()?.excludedRows).toBe(0);
  });

  it('shows a range validation error and blocks review for reversed dates', () => {
    const fixture = TestBed.createComponent(CsvImport);
    const instance = fixture.componentInstance;
    instance.table.set(component.table());
    instance.selected.set([1]);
    instance.rangeForm.setValue({from: DateTime.fromISO('2026-12-31'), to: DateTime.fromISO('2026-01-01')});
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('on or before');
    expect(instance.canReview()).toBe(false);
    instance.review();
    expect(instance.prepared()).toBe(false);
  });

  it('updates the range from calendar selections and locks the calendars during review', () => {
    const fixture = TestBed.createComponent(CsvImport);
    const instance = fixture.componentInstance;
    instance.table.set(parseCsv('Date,Weight\n2025-12-31,60\n2026-01-01,61\n2026-12-31,62\n2027-01-01,63'));
    instance.selected.set([1]);
    fixture.detectChanges();
    const pickers = fixture.debugElement.queryAll(By.directive(MatDatepicker))
      .map(element => element.injector.get<MatDatepicker<DateTime>>(MatDatepicker));
    pickers[0].select(DateTime.fromISO('2026-01-01'));
    pickers[1].select(DateTime.fromISO('2026-12-31'));
    fixture.detectChanges();
    expect(instance.dateRange()).toEqual({from: '01.01.2026', to: '31.12.2026'});
    expect(instance.preview()?.excludedRows).toBe(2);
    const inputs = fixture.nativeElement.querySelectorAll('.date-range input') as NodeListOf<HTMLInputElement>;
    expect(inputs[0].value).toBe('01.01.2026');
    expect(inputs[1].value).toBe('31.12.2026');
    instance.review();
    fixture.detectChanges();
    expect(pickers.every(picker => picker.disabled)).toBe(true);
  });

  it('blocks invalid typed dates and restores open-ended filtering when cleared', () => {
    const fixture = TestBed.createComponent(CsvImport);
    const instance = fixture.componentInstance;
    instance.table.set(component.table());
    instance.selected.set([1]);
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('.date-range input') as HTMLInputElement;
    input.value = '31.02.2026';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain('valid From date');
    expect(instance.canReview()).toBe(false);
    input.value = '';
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(instance.rangeInputError()).toBe('');
    expect(instance.canReview()).toBe(true);
  });

  it('does not prepare selected datasets without any valid points', () => {
    component.table.set(parseCsv('Date,A\ninvalid,1'));
    component.selected.set([1]);
    component.review();
    expect(component.prepared()).toBe(false);
  });

  it('generates IDs without secure-context-only randomUUID on LAN HTTP', () => {
    const uuid = vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => {
      throw new Error('randomUUID is unavailable on an insecure origin');
    });
    try {
      component.review();
      expect(component.graphs.at(0).getRawValue().id).toMatch(/^measurements-[a-f0-9]{16}$/);
    } finally {
      uuid.mockRestore();
    }
  });

  it('commits blur-updated metadata when Enter submits a focused field', async () => {
    const fixture = TestBed.createComponent(CsvImport);
    const instance = fixture.componentInstance;
    instance.table.set(component.table());
    instance.selected.set([1]);
    instance.review();
    instance.confirmed.set(true);
    fixture.detectChanges();
    document.body.appendChild(fixture.nativeElement);
    const input = fixture.nativeElement.querySelector('input[formControlName="title"]') as HTMLInputElement;
    input.focus();
    input.value = 'Edited title';
    input.dispatchEvent(new Event('input'));
    await instance.save();
    expect(service.addStat.mock.calls[0][0].title).toBe('Edited title');
    fixture.nativeElement.remove();
  });

  it('requires confirmation and sends one populated graph', async () => {
    component.review();
    await component.save();
    expect(service.addStat).not.toHaveBeenCalled();
    component.confirmed.set(true);
    await component.save();
    expect(service.addStat).toHaveBeenCalledTimes(1);
    expect(service.addStat.mock.calls[0][0].datasets).toHaveLength(2);
    expect(component.allSaved()).toBe(true);
  });

  it('does not resubmit successful graphs on retry', async () => {
    component.setSeparate(true);
    component.review();
    component.confirmed.set(true);
    service.addStat.mockReturnValueOnce(of(null)).mockReturnValueOnce(throwError(() => new HttpErrorResponse({status: 409})));
    await component.save();
    expect(component.results().map(result => result.status)).toEqual(['saved', 'failed']);
    await component.save();
    expect(service.addStat).toHaveBeenCalledTimes(3);
    expect(component.allSaved()).toBe(true);
  });

  it('blocks existing IDs and availability errors without posting', async () => {
    component.review();
    component.confirmed.set(true);
    service.getStatById.mockReturnValueOnce(of({id: 'existing'}));
    await component.save();
    expect(service.addStat).not.toHaveBeenCalled();
    service.getStatById.mockReturnValueOnce(throwError(() => new HttpErrorResponse({status: 500})));
    await component.save();
    expect(service.addStat).not.toHaveBeenCalled();
    expect(component.results()[0].status).toBe('failed');
  });

  it('requires verification after an uncertain POST and only then permits retry', async () => {
    component.review();
    component.confirmed.set(true);
    service.addStat.mockReturnValueOnce(throwError(() => new HttpErrorResponse({status: 0})));
    await component.save();
    expect(component.hasUnknown()).toBe(true);
    await component.save();
    expect(service.addStat).toHaveBeenCalledTimes(1);
    await component.checkResult(0);
    expect(component.results()[0].status).toBe('failed');
    await component.save();
    expect(component.allSaved()).toBe(true);
  });

  it('recognizes a successful graph after the POST response was lost', async () => {
    component.review();
    component.confirmed.set(true);
    service.addStat.mockReturnValueOnce(throwError(() => new HttpErrorResponse({status: 0})));
    await component.save();
    service.getStatById.mockReturnValueOnce(of(component.results()[0].payload));
    await component.checkResult(0);
    expect(component.allSaved()).toBe(true);
    expect(service.addStat).toHaveBeenCalledTimes(1);
  });

  it('rejects duplicate and unsafe output IDs', async () => {
    component.setSeparate(true);
    component.review();
    component.confirmed.set(true);
    component.graphs.at(0).patchValue({id: 'same'});
    component.graphs.at(1).patchValue({id: 'same'});
    await component.save();
    expect(service.addStat).not.toHaveBeenCalled();
    component.graphs.at(1).patchValue({id: '../unsafe'});
    await component.save();
    expect(service.addStat).not.toHaveBeenCalled();
  });
});