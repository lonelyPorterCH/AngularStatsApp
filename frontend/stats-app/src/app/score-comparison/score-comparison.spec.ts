import {TestBed} from '@angular/core/testing';
import {of, Subject, throwError} from 'rxjs';
import {ScoreComparison} from './score-comparison';
import {ScoreService} from '../services/score-service';
import {Player} from '../models/score';

describe('ScoreComparison player registration', () => {
  const player: Player = {id: '76561198000000000', name: 'New player', country: 'CH', rank: 42};
  let component: ScoreComparison;
  let service: {getPlayers: ReturnType<typeof vi.fn>; getScores: ReturnType<typeof vi.fn>; addPlayer: ReturnType<typeof vi.fn>};

  beforeEach(() => {
    service = {getPlayers: vi.fn().mockReturnValue(of([])), getScores: vi.fn().mockReturnValue(of([])), addPlayer: vi.fn()};
    TestBed.configureTestingModule({});
    component = TestBed.runInInjectionContext(() => new ScoreComparison(service as unknown as ScoreService));
    component.ngOnInit();
  });

  it('finishes loading an empty player list', () => {
    expect(component.loading()).toBe(false);
    expect(component.players()).toEqual([]);
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
});