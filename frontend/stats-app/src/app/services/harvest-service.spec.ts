import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {HarvestService} from './harvest-service';
import {environment} from '../../environments/environment';
import {afterEach, beforeEach, describe, expect, it} from 'vitest';

describe('HarvestService', () => {
  let service: HarvestService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({providers: [provideHttpClient(), provideHttpClientTesting()]});
    service = TestBed.inject(HarvestService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('loads a season projection', () => {
    service.getSeason(2026).subscribe();
    const request = httpTesting.expectOne(`${environment.harvestApiBaseUrl}/2026`);
    expect(request.request.method).toBe('GET');
    request.flush({year: 2026, plants: [], plantTotals: [], plantSeries: [], globalSeries: [], totalQuantity: 0});
  });

  it('posts a harvest entry', () => {
    service.addHarvest(2026, 'plant/1', '2026-07-01', 3).subscribe();
    const request = httpTesting.expectOne(`${environment.harvestApiBaseUrl}/2026/plants/plant%2F1/harvests`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({date: '2026-07-01', quantity: 3});
    request.flush(null);
  });
});
