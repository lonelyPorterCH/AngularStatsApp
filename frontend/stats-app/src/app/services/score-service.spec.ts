import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {firstValueFrom} from 'rxjs';
import {ScoreService} from './score-service';
import {environment} from '../../environments/environment';
import {Player} from '../models/score';

describe('ScoreService', () => {
  let service: ScoreService;
  let httpTesting: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(ScoreService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpTesting.verify());

  it('loads player details from the score API', async () => {
    const players: Player[] = [{id: 'one', name: 'One', country: 'CH', rank: 1}];
    const promise = firstValueFrom(service.getPlayers());
    const request = httpTesting.expectOne(`${environment.scoresApiBaseUrl}/players/details`);
    expect(request.request.method).toBe('GET');
    request.flush(players);
    expect(await promise).toEqual(players);
  });

  it('encodes player ids when comparing scores', async () => {
    const promise = firstValueFrom(service.compareScores('player one', 'player/two'));
    const request = httpTesting.expectOne(
      `${environment.scoresApiBaseUrl}/players/player%20one/scores/compare/player%2Ftwo`
    );
    expect(request.request.method).toBe('GET');
    request.flush({});
    expect(await promise).toEqual({});
  });

  it('posts a score refresh request', async () => {
    const promise = firstValueFrom(service.updateScores('player one'));
    const request = httpTesting.expectOne(`${environment.scoresApiBaseUrl}/players/player%20one/scores/update`);
    expect(request.request.method).toBe('POST');
    request.flush(3);
    expect(await promise).toBe(3);
  });
});
