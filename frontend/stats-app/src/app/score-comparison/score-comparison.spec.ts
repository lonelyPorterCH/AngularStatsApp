import {TestBed} from '@angular/core/testing';
import {of, Subject, throwError} from 'rxjs';
import {ScoreComparison} from './score-comparison';
import {ScoreService} from '../services/score-service';
import {Player, ScoreUpdateSummary, TopScore} from '../models/score';

describe('ScoreComparison player registration', () => {
  const player: Player = {id: '76561198000000000', name: 'New player', country: 'CH', rank: 42};
  let component: ScoreComparison;
  let service: {
    getPlayers: ReturnType<typeof vi.fn>;
    getScores: ReturnType<typeof vi.fn>;
    getTopScores: ReturnType<typeof vi.fn>;
    addPlayer: ReturnType<typeof vi.fn>;
    updateAllScores: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    service = {
      getPlayers: vi.fn().mockReturnValue(of([])),
      getScores: vi.fn().mockReturnValue(of([])),
      getTopScores: vi.fn().mockReturnValue(of([])),
      addPlayer: vi.fn(),
      updateAllScores: vi.fn()
    };
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new ScoreComparison(service as unknown as ScoreService));
    component.ngOnInit();
  });

  it('finishes loading an empty player list', () => {
    expect(component.loading()).toBe(false);
    expect(component.players()).toEqual([]);
  });

  it('starts NF highlighting disabled', () => {
    expect(component.highlightNoFail).toBe(false);
  });

  it('starts the shared-song comparison filter disabled', () => {
    expect(component.sharedSongsOnly).toBe(false);
  });

  it('fetches top scores only on demand and refetches on player changes and re-enabling', () => {
    component.selectedPlayer = player.id;
    expect(component.highlightTopScores).toBe(false);
    component.refreshTopScores();
    expect(service.getTopScores).not.toHaveBeenCalled();
    component.highlightTopScores = true;
    component.refreshTopScores();
    component.refreshTopScores();
    expect(service.getTopScores).toHaveBeenCalledTimes(2);
    component.selectedPlayer = '456';
    component.loadComparison();
    expect(service.getTopScores).toHaveBeenLastCalledWith('456');
    component.highlightTopScores = false;
    component.refreshTopScores();
    expect(component.topScores()).toEqual([]);
    component.highlightTopScores = true;
    component.refreshTopScores();
    expect(service.getTopScores).toHaveBeenCalledTimes(4);
    component.compareMode = true;
    component.onCompareModeChange();
    expect(component.topScores()).toEqual([]);
    expect(service.getTopScores).toHaveBeenCalledTimes(4);
  });

  it('cancels stale top-score requests when switching players, disabling the toggle, or destroying the view', () => {
    const first = new Subject<TopScore[]>();
    const second = new Subject<TopScore[]>();
    service.getTopScores.mockReturnValueOnce(first).mockReturnValueOnce(second);
    component.selectedPlayer = '123';
    component.highlightTopScores = true;
    component.refreshTopScores();
    component.selectedPlayer = '456';
    component.refreshTopScores();
    const top: TopScore = {leaderboardId: 1, songHash: 'hash', timeSet: '2026-01-01T12:00:00', accuracy: 90};
    first.next([top]);
    first.complete();
    expect(component.topScores()).toEqual([]);
    second.next([top]);
    second.complete();
    expect(component.topScores()).toEqual([top]);
    component.highlightTopScores = false;
    component.refreshTopScores();
    expect(component.topScores()).toEqual([]);
    const last = new Subject<TopScore[]>();
    service.getTopScores.mockReturnValue(last);
    component.highlightTopScores = true;
    component.refreshTopScores();
    component.ngOnDestroy();
    last.next([top]);
    expect(component.topScores()).toEqual([]);
  });

  it('reports top-score failures without hiding the chart and allows a fresh retry', () => {
    component.selectedPlayer = player.id;
    component.highlightTopScores = true;
    service.getTopScores.mockReturnValue(throwError(() => new Error('Unavailable')));
    component.refreshTopScores();
    expect(component.topScoresError()).toContain('Could not load');
    expect(component.error()).toBe('');
    expect(component.topScores()).toEqual([]);
    service.getTopScores.mockReturnValue(of([]));
    component.refreshTopScores();
    expect(component.topScoresError()).toBe('');
  });

  it('adds and selects a player and loads their scores', () => {
    service.addPlayer.mockReturnValue(of(player));
    component.addPlayerForm.controls.playerId.setValue(` ${player.id} `);

    component.addPlayer();

    expect(service.addPlayer).toHaveBeenCalledWith(player.id);
    expect(component.players()).toEqual([player]);
    expect(component.playerNames()[player.id]).toBe(player.name);
    expect(component.selectedPlayer).toBe(player.id);
    expect(service.getScores).toHaveBeenCalledWith(player.id);
    expect(component.addPlayerForm.controls.playerId.value).toBe('');
    expect(component.addingPlayer()).toBe(false);
  });

  it('rejects invalid and duplicate ids without an API call', () => {
    component.addPlayerForm.controls.playerId.setValue('../players');
    component.addPlayer();
    expect(component.addPlayerForm.invalid).toBe(true);
    component.players.set([player]);
    component.addPlayerForm.controls.playerId.setValue(player.id);
    component.addPlayer();
    expect(component.addPlayerError()).toContain('already tracked');
    expect(service.addPlayer).not.toHaveBeenCalled();
  });

  it('prevents repeated submissions while registration is pending', () => {
    const response = new Subject<Player>();
    service.addPlayer.mockReturnValue(response);
    component.addPlayerForm.controls.playerId.setValue(player.id);
    component.addPlayer();
    component.addPlayer();
    expect(component.addingPlayer()).toBe(true);
    expect(service.addPlayer).toHaveBeenCalledTimes(1);
    response.next(player);
    response.complete();
    expect(component.addingPlayer()).toBe(false);
  });

  it('keeps the existing comparison player when adding another player', () => {
    component.selectedPlayer = '123';
    component.selectedOtherPlayer = '456';
    service.addPlayer.mockReturnValue(of(player));
    component.addPlayerForm.controls.playerId.setValue(player.id);
    component.addPlayer();
    expect(component.selectedOtherPlayer).toBe('456');
  });

  it('shows a lookup error and allows retrying', () => {
    service.addPlayer.mockReturnValue(throwError(() => ({status: 404})));
    component.addPlayerForm.controls.playerId.setValue(player.id);
    component.addPlayer();
    expect(component.addPlayerError()).toContain('No ScoreSaber player');
    expect(component.addingPlayer()).toBe(false);
    expect(component.players()).toEqual([]);
    expect(component.addPlayerForm.controls.playerId.value).toBe(player.id);

    service.addPlayer.mockReturnValue(of(player));
    component.addPlayer();
    expect(component.addPlayerError()).toBe('');
    expect(component.players()).toEqual([player]);
  });

  it('stops loading when the score request fails', () => {
    component.selectedPlayer = player.id;
    service.getScores.mockReturnValue(throwError(() => new Error('Unavailable')));
    component.loadComparison();
    expect(component.loading()).toBe(false);
    expect(component.error()).toContain('Could not load');
  });

  it('updates all tracked players and shows the per-player popup summary', () => {
    const summary: ScoreUpdateSummary = {
      players: [{playerId: player.id, playerName: player.name, scoresAdded: 5}],
      leaderboardStarsRefreshed: true,
      leaderboardsChanged: 200,
      leaderboardsChecked: 2000
    };
    component.players.set([player]);
    component.selectedPlayer = player.id;
    service.updateAllScores.mockReturnValue(of(summary));

    component.refreshScores(true);

    expect(service.updateAllScores).toHaveBeenCalledWith(true);
    expect(component.updateSummary()).toEqual(summary);
    expect(component.refreshing()).toBe(false);
    expect(service.getScores).toHaveBeenCalledWith(player.id);
  });
});