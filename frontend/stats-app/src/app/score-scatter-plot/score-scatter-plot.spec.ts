import {Score} from '../models/score';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {matchingScoreLocations, ScoreScatterPlot, selectLatestScoresBySongAndLeaderboard} from './score-scatter-plot';

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

    it('draws matching comparison rings and a line, then clears them on empty hover and mouseout', () => {
      fixture.componentRef.setInput('selectionEnabled', false);
      fixture.componentRef.setInput('playerScores', {player: [second, first], other: [{...first, accuracy: 80}]});
      fixture.detectChanges();
      const plugin = chartConfig.mock.lastCall![0].plugins[0];
      const context = {
        save: vi.fn(), restore: vi.fn(), beginPath: vi.fn(), rect: vi.fn(), clip: vi.fn(),
        moveTo: vi.fn(), lineTo: vi.fn(), stroke: vi.fn(), setLineDash: vi.fn(), arc: vi.fn(),
        strokeStyle: '', lineWidth: 0
      };
      const chart = {
        ctx: context, chartArea: {left: 0, top: 0, right: 500, bottom: 400},
        isDatasetVisible: vi.fn().mockReturnValue(true),
        getElementsAtEventForMode: vi.fn().mockReturnValue([{datasetIndex: 0, index: 1}]),
        getDatasetMeta: vi.fn((index: number) => ({data: index === 0
          ? [{x: 90, y: 90}, {x: 100, y: 120}] : [{x: 100, y: 220}]}))
      };
      const args = {event: {type: 'mousemove', native: new MouseEvent('mousemove')}, changed: false};
      plugin.afterEvent(chart, args);
      expect(args.changed).toBe(true);
      plugin.afterDatasetsDraw(chart);
      expect(context.moveTo).toHaveBeenCalledWith(100, 120);
      expect(context.lineTo).toHaveBeenCalledWith(100, 220);
      expect(context.arc).toHaveBeenCalledWith(100, 120, 7, 0, Math.PI * 2);
      expect(context.arc).toHaveBeenCalledWith(100, 220, 9, 0, Math.PI * 2);
      expect(context.arc).toHaveBeenCalledTimes(2);
      expect(context.restore).toHaveBeenCalledOnce();
      context.arc.mockClear();
      chart.getElementsAtEventForMode.mockReturnValue([]);
      plugin.afterEvent(chart, {event: args.event, changed: false});
      plugin.afterDatasetsDraw(chart);
      expect(context.arc).not.toHaveBeenCalled();
      chart.getElementsAtEventForMode.mockReturnValue([{datasetIndex: 1, index: 0}]);
      plugin.afterEvent(chart, {event: args.event, changed: false});
      const leave = {event: {type: 'mouseout'}, changed: false};
      plugin.afterEvent(chart, leave);
      plugin.afterDatasetsDraw(chart);
      expect(leave.changed).toBe(true);
      expect(context.arc).not.toHaveBeenCalled();
      chart.isDatasetVisible.mockImplementation((index: number) => index === 0);
      chart.getElementsAtEventForMode.mockReturnValue([{datasetIndex: 0, index: 1}]);
      plugin.afterEvent(chart, {event: args.event, changed: false});
      plugin.afterDatasetsDraw(chart);
      expect(context.arc).not.toHaveBeenCalled();
    });

    it('shows both accuracies in comparison tooltips and explains missing date-eligible matches', () => {
      fixture.componentRef.setInput('selectionEnabled', false);
      fixture.componentRef.setInput('playerNames', {player: 'Player One', other: 'Player Two'});
      fixture.componentRef.setInput('playerScores', {player: [second, first], other: [{...first, accuracy: 81.23}]});
      fixture.detectChanges();
      let config = chartConfig.mock.lastCall![0];
      const chart = {canvas: fixture.nativeElement.querySelector('canvas'), isDatasetVisible: () => true};
      const tooltip = {opacity: 1, caretX: 100, caretY: 100, dataPoints: [{datasetIndex: 0, dataIndex: 1}]};
      config.options.plugins.tooltip.external({chart, tooltip});
      const element: HTMLElement = fixture.nativeElement.querySelector('.score-tooltip');
      expect(element.textContent).toContain('Player One: 90.00%');
      expect(element.textContent).toContain('Player Two: 81.23%');
      expect(element.classList.contains('score-tooltip--comparison')).toBe(true);
      tooltip.dataPoints[0].dataIndex = 0;
      config.options.plugins.tooltip.external({chart, tooltip});
      expect(element.textContent).toContain('Player One: 90.00%');
      expect(element.textContent).not.toContain('Player Two:');
      expect(element.textContent).toContain('No matching score');
      fixture.componentRef.setInput('playerScores', {player: [first], other: [
        {...first, timeSet: '2026-03-01T12:00:00Z'}
      ]});
      fixture.componentRef.setInput('maximumDate', '2026-02-01T00:00:00Z');
      fixture.detectChanges();
      config = chartConfig.mock.lastCall![0];
      config.options.plugins.tooltip.external({chart, tooltip});
      expect(element.textContent).toContain('No matching score');
      config.options.plugins.tooltip.external({chart, tooltip: {...tooltip, opacity: 0}});
      expect(element.style.opacity).toBe('0');
    });

    it('does not install comparison hover overlays in single-player or compact charts', () => {
      expect(chartConfig.mock.lastCall![0].plugins).toEqual([]);
      fixture.componentRef.setInput('playerScores', {player: [first], other: [first]});
      fixture.componentRef.setInput('compact', true);
      fixture.detectChanges();
      expect(chartConfig.mock.lastCall![0].plugins).toEqual([]);
    });

    it('orders comparison tooltip scores by descending accuracy regardless of player or hovered dot', () => {
      fixture.componentRef.setInput('selectionEnabled', false);
      fixture.componentRef.setInput('playerNames', {player: 'Player One', other: 'Player Two'});
      const chart = {canvas: fixture.nativeElement.querySelector('canvas'), isDatasetVisible: () => true};
      const rows = () => [...fixture.nativeElement.querySelectorAll('.score-tooltip span')]
        .map((row: Element) => row.textContent)
        .filter((text: string | null) => text?.startsWith('Player '));
      for (const otherAccuracy of [95, 80, 90]) {
        fixture.componentRef.setInput('playerScores', {player: [first], other: [{...first, accuracy: otherAccuracy}]});
        fixture.detectChanges();
        const config = chartConfig.mock.lastCall![0];
        for (const datasetIndex of [0, 1]) {
          config.options.plugins.tooltip.external({chart, tooltip: {
            opacity: 1, caretX: 100, caretY: 100, dataPoints: [{datasetIndex, dataIndex: 0}]
          }});
          expect(rows()).toEqual(otherAccuracy > first.accuracy
            ? [`Player Two: ${otherAccuracy.toFixed(2)}%`, 'Player One: 90.00%']
            : ['Player One: 90.00%', `Player Two: ${otherAccuracy.toFixed(2)}%`]);
        }
      }
    });

    it('redraws comparison datasets on shared-song toggles with correct tooltip indices and player colors', () => {
      const common = {...first, accuracy: 80};
      fixture.componentRef.setInput('selectionEnabled', false);
      fixture.componentRef.setInput('playerScores', {player: [second, first], other: [common]});
      fixture.detectChanges();
      expect(chartConfig.mock.lastCall![0].data.datasets[0].data).toHaveLength(2);
      fixture.componentRef.setInput('sharedSongsOnly', true);
      fixture.detectChanges();
      const config = chartConfig.mock.lastCall![0];
      expect(config.data.datasets[0].data).toEqual([{x: first.stars, y: first.accuracy}]);
      expect(config.data.datasets[1].data).toEqual([{x: common.stars, y: common.accuracy}]);
      expect(config.options.plugins.tooltip.callbacks.title([{datasetIndex: 0, dataIndex: 0}])).toBe(first.songName);
      expect(config.data.datasets[0].backgroundColor({dataIndex: 0})).toBe('rgb(0 119 255 / 0.85)');
      expect(config.data.datasets[1].backgroundColor({dataIndex: 0})).toBe('rgb(255 99 132 / 0.85)');
      fixture.componentRef.setInput('sharedSongsOnly', false);
      fixture.detectChanges();
      expect(chartConfig.mock.lastCall![0].data.datasets[0].data).toHaveLength(2);
    });

    it('highlights only NF dots when enabled without creating song selections or rebuilding the chart', () => {
      fixture.componentRef.setInput('playerScores', {
        player: [{...first, noFail: true}, {...second, noFail: false}, {...first, leaderboardId: 3, noFail: null}]
      });
      fixture.detectChanges();
      const dataset = chartConfig.mock.lastCall![0].data.datasets[0];
      const normalColor = dataset.backgroundColor({dataIndex: 0});
      expect(normalColor).toBe('rgb(0 119 255 / 0.85)');
      const builds = chartConfig.mock.calls.length;
      fixture.componentRef.setInput('highlightNoFail', true);
      fixture.detectChanges();
      expect(chartConfig.mock.calls.length).toBe(builds);
      expect(dataset.backgroundColor({dataIndex: 0})).toBe('rgb(255 140 0 / 0.85)');
      expect(dataset.borderColor({dataIndex: 0})).toBe('rgb(255 140 0 / 0.85)');
      expect(dataset.backgroundColor({dataIndex: 1})).toBe(normalColor);
      expect(dataset.backgroundColor({dataIndex: 2})).toBe(normalColor);
      expect(dataset.pointRadius({dataIndex: 0})).toBe(2);
      expect(component.selectedSongs()).toEqual([]);
      expect(fixture.nativeElement.querySelector('.song-selection')).toBeNull();
      fixture.componentRef.setInput('highlightNoFail', false);
      fixture.detectChanges();
      expect(dataset.backgroundColor({dataIndex: 0})).toBe(normalColor);
    });

    it('preserves selection colors over NF highlighting and restores orange after deselection', () => {
      const nfScore = {...first, noFail: true};
      fixture.componentRef.setInput('playerScores', {player: [nfScore]});
      fixture.componentRef.setInput('highlightNoFail', true);
      fixture.detectChanges();
      const dataset = chartConfig.mock.lastCall![0].data.datasets[0];
      component.toggleScore('player', nfScore);
      const color = component.selectedSongs()[0].color;
      expect(dataset.backgroundColor({dataIndex: 0})).toBe(color);
      fixture.componentRef.setInput('highlightNoFail', false);
      fixture.detectChanges();
      expect(dataset.backgroundColor({dataIndex: 0})).toBe(color);
      fixture.componentRef.setInput('highlightNoFail', true);
      fixture.detectChanges();
      component.removeSelection(component.selectedSongs()[0].key);
      expect(dataset.backgroundColor({dataIndex: 0})).toBe('rgb(255 140 0 / 0.85)');
    });

    it('never applies NF orange to comparison or compact previews even if the input is enabled', () => {
      fixture.componentRef.setInput('playerScores', {player: [{...first, noFail: true}]});
      fixture.componentRef.setInput('highlightNoFail', true);
      fixture.componentRef.setInput('selectionEnabled', false);
      fixture.detectChanges();
      expect(chartConfig.mock.lastCall![0].data.datasets[0].backgroundColor({dataIndex: 0}))
        .toBe('rgb(0 119 255 / 0.85)');
      fixture.componentRef.setInput('selectionEnabled', true);
      fixture.componentRef.setInput('compact', true);
      fixture.detectChanges();
      expect(chartConfig.mock.lastCall![0].data.datasets[0].backgroundColor({dataIndex: 0}))
        .toBe('rgb(0 119 255 / 0.2)');
      fixture.componentRef.setInput('compact', false);
      fixture.componentRef.setInput('playerScores', {
        player: [{...first, noFail: true}], other: [{...second, noFail: true}]
      });
      fixture.detectChanges();
      expect(chartConfig.mock.lastCall![0].data.datasets[0].backgroundColor({dataIndex: 0}))
        .toBe('rgb(0 119 255 / 0.85)');
      expect(chartConfig.mock.lastCall![0].data.datasets[1].backgroundColor({dataIndex: 0}))
        .toBe('rgb(255 99 132 / 0.85)');
    });

    it('uses the NF flag from the latest eligible play at the slider date', () => {
      fixture.componentRef.setInput('highlightNoFail', true);
      fixture.componentRef.setInput('playerScores', {player: [
        {...first, noFail: true},
        {...first, noFail: false, timeSet: '2026-02-01T12:00:00Z'}
      ]});
      fixture.detectChanges();
      expect(chartConfig.mock.lastCall![0].data.datasets[0].backgroundColor({dataIndex: 0}))
        .toBe('rgb(0 119 255 / 0.85)');
      fixture.componentRef.setInput('maximumDate', '2026-01-02T00:00:00Z');
      fixture.detectChanges();
      expect(chartConfig.mock.lastCall![0].data.datasets[0].backgroundColor({dataIndex: 0}))
        .toBe('rgb(255 140 0 / 0.85)');
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

  it('filters shared songs by both hash and leaderboard while keeping each players latest score', () => {
    const older = makeScore('song-a', '2026-01-01T12:00:00Z', 70, 1);
    const newer = makeScore('song-a', '2026-02-01T12:00:00Z', 85, 1);
    const otherPlayer = makeScore('song-a', '2026-01-02T12:00:00Z', 90, 1);
    const differentDifficulty = makeScore('song-a', '2026-01-01T12:00:00Z', 80, 2);
    const differentHash = makeScore('song-b', '2026-01-01T12:00:00Z', 80, 2);
    const source = {one: [older, differentDifficulty, newer], two: [differentHash, otherPlayer]};
    const original = JSON.stringify(source);

    expect(selectLatestScoresBySongAndLeaderboard(source, undefined, true))
      .toEqual({one: [newer], two: [otherPlayer]});
    expect(JSON.stringify(source)).toBe(original);
  });

  it('requires both players to have played the shared difficulty by the selected date', () => {
    const first = makeScore('song-a', '2026-01-01T12:00:00Z', 70, 1);
    const second = makeScore('song-a', '2026-02-01T12:00:00Z', 80, 1);
    const source = {one: [first], two: [second]};

    expect(selectLatestScoresBySongAndLeaderboard(source, '2026-02-01T11:59:59Z', true))
      .toEqual({one: [], two: []});
    expect(selectLatestScoresBySongAndLeaderboard(source, second.timeSet, true))
      .toEqual({one: [first], two: [second]});
  });

  it('finds matching song and leaderboard locations independently of dot order', () => {
    const first = makeScore('song-a', '2026-01-01T12:00:00Z', 70, 1);
    const differentHash = {...first, songHash: 'song-b'};
    const differentDifficulty = {...first, leaderboardId: 2};
    const entries: [string, Score[]][] = [
      ['one', [differentHash, first]],
      ['two', [differentDifficulty, {...first, accuracy: 90}]]
    ];
    expect(matchingScoreLocations(entries, 0, 1)).toEqual([
      {datasetIndex: 0, index: 1}, {datasetIndex: 1, index: 1}
    ]);
    expect(matchingScoreLocations(entries, 0, 0)).toEqual([{datasetIndex: 0, index: 0}]);
    expect(matchingScoreLocations(entries, 0, 50)).toEqual([]);
  });

  it('returns empty datasets when a comparison player has no eligible scores and leaves single-player data intact', () => {
    const first = makeScore('song-a', '2026-01-01T12:00:00Z', 70);
    expect(selectLatestScoresBySongAndLeaderboard({one: [first], two: []}, undefined, true))
      .toEqual({one: [], two: []});
    expect(selectLatestScoresBySongAndLeaderboard({one: [first]}, undefined, true))
      .toEqual({one: [first]});
    expect(selectLatestScoresBySongAndLeaderboard({}, undefined, true)).toEqual({});
  });

  it('includes scores exactly on the selected-date boundary and excludes later scores', () => {
    const boundary = makeScore('song-a', '2026-02-01T12:00:00Z', 69, 1);
    const afterBoundary = makeScore('song-b', '2026-02-01T12:00:00.001Z', 72, 2);

    expect(selectLatestScoresBySongAndLeaderboard({player: [boundary, afterBoundary]}, boundary.timeSet)['player'])
      .toEqual([boundary]);
  });
});
