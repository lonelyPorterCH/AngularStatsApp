import {TestBed} from '@angular/core/testing';
import {provideRouter} from '@angular/router';
import {HttpErrorResponse} from '@angular/common/http';
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
    component.review();
    component.confirmed.set(true);
    const input = {files: [{name: 'new.csv', text: async () => 'Date,Other\n2026-10-30,1'}], value: 'old.csv'};
    await component.loadFile({target: input} as unknown as Event);
    expect(component.table()?.headers).toEqual(['Date', 'Other']);
    expect(component.selected()).toEqual([]);
    expect(component.prepared()).toBe(false);
    expect(component.confirmed()).toBe(false);
    expect(input.value).toBe('');
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