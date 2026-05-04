import {TestBed} from '@angular/core/testing';

import {StatService} from './stat-service';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {firstValueFrom} from 'rxjs';
import {Stat} from '../models/stat';

describe('StatService', () => {
  let service: StatService;
  let httpTesting: HttpTestingController;

  const DEFAULT_STAT: Stat = {
    id: '',
    title: '',
    xAxisName: '',
    yAxisName: '',
    reverse: false,
    dataPoints: []
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(StatService);
    httpTesting = TestBed.inject(HttpTestingController)
  });

  afterEach(() => {
    httpTesting.verify();  // assert that no other requests were made
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should load stats', async () => {
    //Load Stats from Service
    const stats$ = service.getStats();

    // `firstValueFrom` subscribes to the `Observable`, which makes the HTTP request,
    // and creates a `Promise` of the response.
    const statPromise = firstValueFrom(stats$);

    // At this point, the request is pending, and we can assert it was made
    // via the `HttpTestingController`:
    const req = httpTesting.expectOne('/api/stats');

    // Flushing the request causes it to complete, delivering the result.
    expect(req.request.method).toBe('GET');

    req.flush(DEFAULT_STAT);

    // We can then assert that the response was successfully delivered by the `ConfigService`:
    expect(await statPromise).toEqual(DEFAULT_STAT);
  });
});
