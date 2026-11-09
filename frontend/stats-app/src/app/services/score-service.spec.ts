import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {firstValueFrom} from 'rxjs';
import {ScoreService} from './score-service';
import {environment} from '../../environments/environment';
import {Player, ScoreUpdateSummary} from '../models/score';

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

  it('posts a player id to start tracking a player', async () => {
    const player: Player = {id: '76561198000000000', name: 'New player', country: 'CH', rank: 1};
    const promise = firstValueFrom(service.addPlayer(player.id));
    const request = httpTesting.expectOne(`${environment.scoresApiBaseUrl}/players/${player.id}`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({});
    request.flush(player);
    expect(await promise).toEqual(player);
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

  it('fetches current top scores on every call with caching disabled', async () => {
    for (let index = 0; index < 2; index++) {
      const promise = firstValueFrom(service.getTopScores('player one'));
      const request = httpTesting.expectOne(`${environment.scoresApiBaseUrl}/players/player%20one/scores/top`);
      expect(request.request.method).toBe('GET');
      expect(request.request.headers.get('Cache-Control')).toBe('no-cache, no-store');
      request.flush([]);
      expect(await promise).toEqual([]);
    }
  });

  it('posts a request to update all tracked players', async () => {
    const summary: ScoreUpdateSummary = {
      players: [{playerId: 'player-1', playerName: 'Player One', scoresAdded: 3}],
      leaderboardStarsRefreshed: false,
      leaderboardsChanged: 0,
      leaderboardsChecked: 0
    };
    const promise = firstValueFrom(service.updateAllScores(false));
    const request = httpTesting.expectOne(`${environment.scoresApiBaseUrl}/players/scores/update`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({refreshLeaderboardStars: false});
    request.flush(summary);
    expect(await promise).toEqual(summary);
  });
});
