import {Score} from '../models/score';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {ScoreScatterPlot, selectLatestScoresBySongAndLeaderboard} from './score-scatter-plot';

const chartConfig = vi.hoisted(() => vi.fn());
const chartUpdate = vi.hoisted(() => vi.fn());
vi.mock('chartjs-adapter-luxon', () => ({}));
vi.mock('chart.js', () => ({
  registerables: [],
  Chart: class {
    static register() {}
    constructor(_context: unknown, configuration: unknown) { chartConfig(configuration); }
    destroy() {}
    update(mode: string) { chartUpdate(mode); }
  }
}));

describe('selectLatestScoresBySongAndLeaderboard', () => {
  const makeScore = (
    songHash: string,
    timeSet: string,
    accuracy: number,
    leaderboardId: number = 1
  ): Score => ({
    songName: `Song ${songHash}`,
    levelAuthorName: 'Mapper',
    timeSetMillis: Date.parse(timeSet),
    accuracy,
    leaderboardId,
    stars: 5,
    timeSet,
    songHash
  });

  describe('ScoreScatterPlot selection', () => {
    const first: Score = {
      songName: 'First song', songHash: 'a'.repeat(40), levelAuthorName: 'Mapper',
      leaderboardId: 1, stars: 5, accuracy: 90, timeSet: '2026-01-01T12:00:00Z',
      timeSetMillis: Date.parse('2026-01-01T12:00:00Z'), difficulty: {characteristic: 'Standard', name: 'Normal'}
    };
    const second: Score = {...first, songName: 'Second song', leaderboardId: 2, songHash: 'b'.repeat(40)};
    let fixture: ComponentFixture<ScoreScatterPlot>;
    let component: ScoreScatterPlot;

    beforeEach(async () => {
      await TestBed.configureTestingModule({imports: [ScoreScatterPlot]}).compileComponents();
      fixture = TestBed.createComponent(ScoreScatterPlot);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('playerScores', {player: [first, second]});
      fixture.componentRef.setInput('playerNames', {player: 'Player'});
      fixture.componentRef.setInput('selectionEnabled', true);
      fixture.detectChanges();
      await fixture.whenStable();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('toggles dots independently and retains the other dots highlight and color', () => {
      const config = chartConfig.mock.lastCall![0];
      const dataset = config.data.datasets[0];
      expect(dataset.pointRadius({dataIndex: 0})).toBe(2);
      config.options.onClick(undefined, [{datasetIndex: 0, index: 0}]);
      const color = component.selectedSongs()[0].color;
      expect(dataset.pointRadius({dataIndex: 0})).toBe(6);
      expect(dataset.backgroundColor({dataIndex: 0})).toBe(color);
      config.options.onClick(undefined, [{datasetIndex: 0, index: 1}]);
      expect(component.selectedSongs()[0].color).toBe(color);
      expect(component.selectedSongs()[1].color).not.toBe(color);
      config.options.onClick(undefined, [{datasetIndex: 0, index: 1}]);
      expect(component.selectedSongs()).toHaveLength(1);
      expect(dataset.backgroundColor({dataIndex: 0})).toBe(color);
      expect(dataset.pointRadius({dataIndex: 1})).toBe(2);
      expect(chartUpdate).toHaveBeenCalledWith('none');
      config.options.onClick(undefined, []);
      expect(component.selectedSongs()).toHaveLength(1);
    });

    it('shows song details and removes a selection with the card button', () => {
      component.toggleScore('player', first);
      fixture.detectChanges();
      const element: HTMLElement = fixture.nativeElement;
      expect(element.querySelector('.score-layout')?.classList.contains('has-selection')).toBe(true);
      expect(element.querySelector('.song-card')?.textContent).toContain('Standard / Normal');
      expect(element.querySelector('.song-card')?.textContent).toContain('90.00% accuracy');
      expect(element.querySelector('.song-card')?.textContent).toContain('Mapper');
      expect(element.querySelector('.song-selection footer')?.textContent).toContain('Export as Beat Saber playlist');
      element.querySelector<HTMLButtonElement>('[aria-label="Remove First song"]')!.click();
      fixture.detectChanges();
      expect(component.selectedSongs()).toEqual([]);
      expect(element.querySelector('.song-selection')).toBeNull();
      expect(element.querySelector('.score-layout')?.classList.contains('has-selection')).toBe(false);
    });

    it('disables selection in comparison mode even when both selected players have the same ID', () => {
      fixture.componentRef.setInput('selectionEnabled', false);
      fixture.detectChanges();
      component.toggleScore('player', first);
      expect(component.selectedSongs()).toEqual([]);
      fixture.componentRef.setInput('selectionEnabled', true);
      fixture.componentRef.setInput('playerScores', {player: [first], other: [second]});
      fixture.detectChanges();
      component.toggleScore('player', first);
      expect(component.selectedSongs()).toEqual([]);
    });

    it('clears selection when entering comparison or compact preview', () => {
      component.toggleScore('player', first);
      fixture.componentRef.setInput('selectionEnabled', false);
      fixture.detectChanges();
      expect(component.selectedSongs()).toEqual([]);
      fixture.componentRef.setInput('selectionEnabled', true);
      fixture.componentRef.setInput('compact', true);
      fixture.detectChanges();
      component.toggleScore('player', first);
      expect(component.selectedSongs()).toEqual([]);
    });

    it('preserves eligible selections across redraws, refreshes details and removes invisible selections', () => {
      component.toggleScore('player', first);
      const color = component.selectedSongs()[0].color;
      const newer = {...first, accuracy: 95, timeSet: '2026-02-01T12:00:00Z'};
      fixture.componentRef.setInput('playerScores', {player: [first, newer, second]});
      fixture.detectChanges();
      expect(component.selectedSongs()[0].score.accuracy).toBe(95);
      expect(component.selectedSongs()[0].color).toBe(color);
      fixture.componentRef.setInput('maximumDate', '2026-01-02T00:00:00Z');
      fixture.detectChanges();
      expect(component.selectedSongs()[0].score.accuracy).toBe(90);
      fixture.componentRef.setInput('maximumDate', '2025-01-01T00:00:00Z');
      fixture.detectChanges();
      expect(component.selectedSongs()).toEqual([]);
    });

    it('does not carry selections over to another player', () => {
      component.toggleScore('player', first);
      fixture.componentRef.setInput('playerScores', {other: [first]});
      fixture.detectChanges();
      expect(component.selectedSongs()).toEqual([]);
    });

    it('downloads a .bplist with all selected difficulties and cleans up its object URL', async () => {
      component.toggleScore('player', first);
      component.toggleScore('player', {...first, leaderboardId: 3, difficulty: {characteristic: 'Standard', name: 'Hard'}});
      const createObjectURL = vi.fn().mockReturnValue('blob:playlist');
      const revokeObjectURL = vi.fn();
      vi.stubGlobal('URL', {createObjectURL, revokeObjectURL});
      const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        expect(this.download).toBe('statsapp-selection.bplist');
        expect(this.href).toBe('blob:playlist');
      });
      component.exportPlaylist();
      expect(click).toHaveBeenCalledOnce();
      const blob: Blob = createObjectURL.mock.calls[0][0];
      const text = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsText(blob);
      });
      expect(JSON.parse(text).songs[0].difficulties).toHaveLength(2);
      expect(component.exportError()).toBe('');
      await new Promise(resolve => setTimeout(resolve, 10));
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:playlist');
      expect(document.querySelector('a[download]')).toBeNull();
    });

    it('reports missing difficulty metadata in the panel instead of guessing or silently omitting songs', () => {
      component.toggleScore('player', {...first, difficulty: null});
      component.exportPlaylist();
      fixture.detectChanges();
      expect(component.exportError()).toContain('missing difficulty');
      const element: HTMLElement = fixture.nativeElement;
      expect(element.querySelector('[role="alert"]')?.textContent).toContain('migrate');
    });
  });

  it('selects only the latest score achieved on or before the selected date', () => {
    const january = makeScore('song-a', '2026-01-10T12:00:00Z', 69);
    const march = makeScore('song-a', '2026-03-15T12:00:00Z', 72);
    const scores = {player: [january, march]};

    expect(selectLatestScoresBySongAndLeaderboard(scores, '2026-03-15T11:59:59Z')['player']).toEqual([january]);
    expect(selectLatestScoresBySongAndLeaderboard(scores, '2026-03-15T12:00:00Z')['player']).toEqual([march]);
    expect(scores['player']).toEqual([january, march]);
  });

  it('keeps the latest eligible score for each distinct song and leaderboard', () => {
    const first = makeScore('song-a', '2026-01-10T12:00:00Z', 69);
    const latest = makeScore('song-a', '2026-03-15T12:00:00Z', 72);
    const otherSong = makeScore('song-b', '2026-02-01T12:00:00Z', 80, 3);

    expect(selectLatestScoresBySongAndLeaderboard({player: [first, otherSong, latest]}, '2026-03-15T12:00:00Z')['player'])
      .toEqual([latest, otherSong]);
  });

  it('keeps the latest score separately for each leaderboard of the same song', () => {
    const easyEarlier = makeScore('song-a', '2026-01-10T12:00:00Z', 69, 101);
    const easyLatest = makeScore('song-a', '2026-03-15T12:00:00Z', 72, 101);
    const expertLatest = makeScore('song-a', '2026-02-20T12:00:00Z', 80, 202);

    expect(selectLatestScoresBySongAndLeaderboard({player: [easyEarlier, expertLatest, easyLatest]})['player'])
      .toEqual([easyLatest, expertLatest]);
  });

  it('selects scores separately for each player in comparison mode', () => {
    const playerOne = makeScore('song-a', '2026-02-01T12:00:00Z', 69, 1);
    const playerTwo = makeScore('song-a', '2026-02-02T12:00:00Z', 72, 2);

    expect(selectLatestScoresBySongAndLeaderboard({
      one: [playerOne],
      two: [playerTwo]
    }, '2026-02-03T00:00:00Z')).toEqual({
      one: [playerOne],
      two: [playerTwo]
    });
  });

  it('keeps the first score when timestamps are equal for a leaderboard', () => {
    const first = makeScore('song-a', '2026-02-01T12:00:00Z', 69);
    const later = makeScore('song-a', '2026-02-01T12:00:00Z', 72);

    expect(selectLatestScoresBySongAndLeaderboard({player: [first, later]})['player']).toEqual([first]);
  });

  it('includes scores exactly on the selected-date boundary and excludes later scores', () => {
    const boundary = makeScore('song-a', '2026-02-01T12:00:00Z', 69, 1);
    const afterBoundary = makeScore('song-b', '2026-02-01T12:00:00.001Z', 72, 2);

    expect(selectLatestScoresBySongAndLeaderboard({player: [boundary, afterBoundary]}, boundary.timeSet)['player'])
      .toEqual([boundary]);
  });
});
