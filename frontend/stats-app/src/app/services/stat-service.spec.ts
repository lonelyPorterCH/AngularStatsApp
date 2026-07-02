import {TestBed} from '@angular/core/testing';
import {StatService} from './stat-service';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {firstValueFrom} from 'rxjs';
import {Stat} from '../models/stat';
import {environment} from '../../environments/environment';

const MOCK_STAT: Stat = {
  id: 'test-stat',
  title: 'Test Stat',
  xAxisName: 'Date',
  yAxisName: 'Value',
  reverse: false,
  datasets: [{
    label: 'Series',
    index: 0,
    dataPoints: [{x: '2026-01-01', y: '100'}]
  }]
};

const MOCK_DATA_POINT = {x: '2026-02-01', y: '200'};

describe('StatService', () => {
  let service: StatService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(StatService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch all stats', async () => {
    const promise = firstValueFrom(service.getStats());

    const req = httpTesting.expectOne(`${environment.apiBaseUrl}`);
    expect(req.request.method).toBe('GET');
    req.flush([MOCK_STAT]);

    expect(await promise).toEqual([MOCK_STAT]);
  });

  it('should fetch all archived stats', async () => {
    const promise = firstValueFrom(service.getArchivedStats());

    const req = httpTesting.expectOne(`${environment.apiBaseUrl}/archived`);
    expect(req.request.method).toBe('GET');
    req.flush([MOCK_STAT]);

    expect(await promise).toEqual([MOCK_STAT]);
  });

  it('should fetch a stat by id', async () => {
    const promise = firstValueFrom(service.getStatById('test-stat'));

    const req = httpTesting.expectOne(`${environment.apiBaseUrl}/test-stat`);
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_STAT);

    expect(await promise).toEqual(MOCK_STAT);
  });

  it('should return true from existsById when stat is found', async () => {
    const promise = firstValueFrom(service.existsById('test-stat'));

    const req = httpTesting.expectOne(`${environment.apiBaseUrl}/test-stat`);
    req.flush(MOCK_STAT);

    expect(await promise).toBe(true);
  });

  it('should return false from existsById when stat is not found', async () => {
    const promise = firstValueFrom(service.existsById('non-existent'));

    const req = httpTesting.expectOne(`${environment.apiBaseUrl}/non-existent`);
    req.flush('Not found', {status: 404, statusText: 'Not Found'});

    expect(await promise).toBe(false);
  });

  it('should treat archived as a reserved id', async () => {
    const promise = firstValueFrom(service.existsById('archived'));

    expect(await promise).toBe(true);
  });

  it('should check whether a stat is archived', async () => {
    const promise = firstValueFrom(service.isArchived('test-stat'));

    const req = httpTesting.expectOne('/api/stats/test-stat/archived');
    expect(req.request.method).toBe('GET');
    req.flush(true);

    expect(await promise).toBe(true);
  });

  it('should post a new stat', async () => {
    const promise = firstValueFrom(service.addStat(MOCK_STAT));

    const req = httpTesting.expectOne(`${environment.apiBaseUrl}`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(MOCK_STAT);
    req.flush(MOCK_STAT);

    await promise;
  });

  it('should delete a stat by id', async () => {
    const promise = firstValueFrom(service.deleteStat('test-stat'));

    const req = httpTesting.expectOne(`${environment.apiBaseUrl}/test-stat`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);

    await promise;
  });

  it('should toggle archive state', async () => {
    const promise = firstValueFrom(service.toggleArchive('test-stat'));

    const req = httpTesting.expectOne(`${environment.apiBaseUrl}/test-stat/archived`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({});
    req.flush(null);

    await promise;
  });

  it('should post a new datapoint', async () => {
    const promise = firstValueFrom(service.addDataPoint('test-stat', 'Series', MOCK_DATA_POINT));

    const req = httpTesting.expectOne(`${environment.apiBaseUrl}/test-stat/datapoint`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({datasetLabel: 'Series', x: MOCK_DATA_POINT.x, y: MOCK_DATA_POINT.y});
    req.flush(null);

    await promise;
  });

  it('should delete a datapoint', async () => {
    const promise = firstValueFrom(service.deleteDataPoint('test-stat', 'Series', MOCK_DATA_POINT));

    const req = httpTesting.expectOne(`${environment.apiBaseUrl}/test-stat/datapoint`);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toEqual({datasetLabel: 'Series', x: MOCK_DATA_POINT.x, y: MOCK_DATA_POINT.y});
    req.flush(null);

    await promise;
  });
});
