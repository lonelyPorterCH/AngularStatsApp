import {ComponentFixture, TestBed} from '@angular/core/testing';
import {DateTime} from 'luxon';
import {ChartComponent, chartDataPoints} from './chart';
import {Stat} from '../models/stat';

const chartConfig = vi.hoisted(() => vi.fn());
vi.mock('chartjs-adapter-luxon', () => ({}));
vi.mock('chart.js', () => ({
  registerables: [],
  Chart: class {
    static register() {}
    constructor(_context: unknown, configuration: unknown) { chartConfig(configuration); }
    destroy() {}
  }
}));

describe('dataset smoothing windows', () => {
  const stat: Stat = {id: 'chart', title: 'Chart', xAxisName: 'X', yAxisName: 'Y', reverse: false,
    xAxisScaleType: 'linear', datasets: []};
  const points = Array.from({length: 8}, (_, i) => ({x: String(i), y: String(i * 10)}));

  it('uses the requested trailing window and preserves measurements', () => {
    const original = JSON.stringify(points);
    expect(chartDataPoints(points, stat, true, 3).map(p => p.y)).toEqual([0, 5, 10, 20, 30, 40, 50, 60]);
    expect(chartDataPoints(points, stat, true, 1).map(p => p.y)).toEqual(points.map(p => Number(p.y)));
    expect(chartDataPoints(points, stat, true).at(-1)?.y).toBe(40);
    expect(chartDataPoints([{x: '1', y: '10'}, {x: '2', y: 'invalid'}, {x: '3', y: '30'},
      {x: '4', y: '50'}], stat, true, 2).map(p => p.y)).toEqual([10, NaN, 30, 40]);
    expect(JSON.stringify(points)).toBe(original);
  });

  it('renders each dataset with its own window, leaving unsmoothed datasets unchanged', async () => {
    await TestBed.configureTestingModule({imports: [ChartComponent]}).compileComponents();
    const fixture: ComponentFixture<ChartComponent> = TestBed.createComponent(ChartComponent);
    fixture.componentRef.setInput('stat', {...stat, datasets: [
      {label: 'Short', index: 0, smoothing: true, smoothingWindow: 3, dataPoints: points},
      {label: 'Default', index: 1, smoothing: true, dataPoints: points},
      {label: 'Raw', index: 2, smoothing: false, smoothingWindow: 3, dataPoints: points}
    ]});
    fixture.detectChanges();
    const datasets = chartConfig.mock.lastCall![0].data.datasets;
    expect(datasets.map((dataset: {data: {y: number}[]}) => dataset.data.at(-1)?.y)).toEqual([60, 40, 70]);
    fixture.destroy();
  });

  it('interpolates only gaps of at least seven calendar days for smoothed date datasets', async () => {
    await TestBed.configureTestingModule({imports: [ChartComponent]}).compileComponents();
    const fixture = TestBed.createComponent(ChartComponent);
    const source = [{x: '2026-10-01', y: '10'}, {x: '2026-10-08', y: '24'},
      {x: '2026-10-14', y: '30'}];
    const original = JSON.stringify(source);
    const dataset = {label: 'Series', index: 0, smoothing: true, smoothingWindow: 3,
      interpolateGaps: true, dataPoints: source};
    fixture.componentRef.setInput('stat', {...stat, xAxisScaleType: 'time', datasets: [dataset]});
    fixture.detectChanges();
    let config = chartConfig.mock.lastCall![0];
    const values = config.data.datasets[0].data;
    expect(values.map((p: {x: string}) => p.x)).toEqual([
      '2026-10-01', '2026-10-02', '2026-10-03', '2026-10-04', '2026-10-05',
      '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-14'
    ]);
    expect(values[7].y).toBe(22);
    expect(config.options.plugins.tooltip.callbacks.afterLabel({datasetIndex: 0, dataIndex: 1}))
      .toBe('Interpolated: 12');
    expect(config.options.plugins.tooltip.callbacks.afterLabel({datasetIndex: 0, dataIndex: 7}))
      .toBe('Recorded: 24');
    const emit = vi.spyOn(fixture.componentInstance.pointClick, 'emit');
    config.options.onClick(null, [{datasetIndex: 0, index: 1}]);
    expect(emit).not.toHaveBeenCalled();
    config.options.onClick(null, [{datasetIndex: 0, index: 7}]);
    expect(emit).toHaveBeenCalledWith({datasetLabel: 'Series', point: source[1]});
    emit.mockClear();
    config.options.onClick(null, [{datasetIndex: 0, index: 1}, {datasetIndex: 0, index: 7}]);
    expect(emit).toHaveBeenCalledWith({datasetLabel: 'Series', point: source[1]});
    expect(JSON.stringify(source)).toBe(original);

    for (const changes of [{smoothing: false}, {interpolateGaps: false}, {interpolateGaps: undefined}]) {
      fixture.componentRef.setInput('stat', {...stat, xAxisScaleType: 'time', datasets: [{...dataset, ...changes}]});
      fixture.detectChanges();
      config = chartConfig.mock.lastCall![0];
      expect(config.data.datasets[0].data).toHaveLength(3);
    }
    fixture.destroy();
  });

  it('keeps interpolated days after timestamped measurements in chart time', async () => {
    await TestBed.configureTestingModule({imports: [ChartComponent]}).compileComponents();
    const fixture = TestBed.createComponent(ChartComponent);
    const first = DateTime.local(2026, 3, 25, 23, 30);
    const last = first.plus({days: 7});
    fixture.componentRef.setInput('stat', {...stat, xAxisScaleType: 'time', datasets: [
      {label: 'Series', index: 0, smoothing: true, interpolateGaps: true,
        dataPoints: [{x: first.toISO()!, y: '10'}, {x: last.toISO()!, y: '24'}]}
    ]});
    fixture.detectChanges();
    const points = chartConfig.mock.lastCall![0].data.datasets[0].data;
    expect(points).toHaveLength(8);
    expect(DateTime.fromISO(points[1].x).toMillis()).toBeGreaterThan(first.toMillis());
    expect(DateTime.fromISO(points[6].x).toMillis()).toBeLessThan(last.toMillis());
    fixture.destroy();
  });

  it('interpolates pace in seconds across daylight-saving changes without bridging invalid values', async () => {
    await TestBed.configureTestingModule({imports: [ChartComponent]}).compileComponents();
    const fixture = TestBed.createComponent(ChartComponent);
    fixture.componentRef.setInput('stat', {...stat, xAxisScaleType: 'time', yAxisFormat: 'pace', datasets: [
      {label: 'Run', index: 0, smoothing: true, smoothingWindow: 1, interpolateGaps: true, dataPoints: [
        {x: '2026-03-25', y: '5:00'}, {x: '2026-04-01', y: '6:10'},
        {x: '2026-04-08', y: 'invalid'}, {x: '2026-04-15', y: '6:00'}
      ]}
    ]});
    fixture.detectChanges();
    const config = chartConfig.mock.lastCall![0];
    expect(config.data.datasets[0].data).toHaveLength(10);
    expect(config.data.datasets[0].data[1]).toEqual({x: '2026-03-26', y: 310});
    expect(config.options.plugins.tooltip.callbacks.afterLabel({datasetIndex: 0, dataIndex: 1}))
      .toBe('Interpolated: 5:10 /km');
    fixture.destroy();
  });

  it('does not interpolate numeric axes or dots-and-trend charts', async () => {
    await TestBed.configureTestingModule({imports: [ChartComponent]}).compileComponents();
    const fixture = TestBed.createComponent(ChartComponent);
    const dataset = {label: 'Series', index: 0, smoothing: true, interpolateGaps: true,
      dataPoints: [{x: '1', y: '10'}, {x: '8', y: '24'}]};
    fixture.componentRef.setInput('stat', {...stat, datasets: [dataset]});
    fixture.detectChanges();
    expect(chartConfig.mock.lastCall![0].data.datasets[0].data).toHaveLength(2);
    fixture.componentRef.setInput('stat', {...stat, xAxisScaleType: 'time', effortComparison: true,
      datasets: [{...dataset, dataPoints: [{x: '2026-10-01', y: '10'}, {x: '2026-10-08', y: '24'}]}]});
    fixture.detectChanges();
    expect(chartConfig.mock.lastCall![0].data.datasets[0].data).toHaveLength(2);
    fixture.componentRef.setInput('stat', {...stat, chartType: 'bar', xAxisScaleType: 'time',
      datasets: [{...dataset, dataPoints: [{x: '2026-10-01', y: '10'}, {x: '2026-10-08', y: '24'}]}]});
    fixture.detectChanges();
    expect(chartConfig.mock.lastCall![0].data.datasets[0].data).toHaveLength(2);
    fixture.destroy();
  });

  it('preserves percentage tooltip counts for bars, smoothed lines, and comparison dots', async () => {
    await TestBed.configureTestingModule({imports: [ChartComponent]}).compileComponents();
    const fixture = TestBed.createComponent(ChartComponent);
    const dataset = {label: 'Progress', index: 0, percentageTarget: 50, smoothing: true, smoothingWindow: 2,
      dataPoints: [{x: '1', y: '04'}, {x: '2', y: '8'}]};
    const item = {datasetIndex: 0, dataIndex: 1, parsed: {y: 12}};

    fixture.componentRef.setInput('stat', {...stat, yAxisFormat: 'percentage', datasets: [dataset]});
    fixture.detectChanges();
    let callbacks = chartConfig.mock.lastCall![0].options.plugins.tooltip.callbacks;
    expect(callbacks.label(item)).toBe('Progress: 6 / 50');
    expect(callbacks.afterLabel(item)).toBe('Recorded: 8');
    expect(callbacks.label({...item, parsed: {y: null}})).toBe('Progress: ');
    expect(callbacks.label({...item, dataIndex: 99})).toBe('Progress: ');

    for (const settings of [{chartType: 'bar' as const}, {effortComparison: true}]) {
      fixture.componentRef.setInput('stat', {...stat, ...settings, yAxisFormat: 'percentage', datasets: [dataset]});
      fixture.detectChanges();
      const config = chartConfig.mock.lastCall![0];
      callbacks = config.options.plugins.tooltip.callbacks;
      expect(callbacks.label({...item, dataIndex: 0})).toBe('Progress: 04 / 50');
      expect(callbacks.afterLabel(item)).toBe('');
      if ('chartType' in settings) {
        expect(config.options.scales.x.suggestedMin).toBe(0.5);
        expect(config.options.scales.x.suggestedMax).toBe(2.5);
      }
    }

    fixture.componentRef.setInput('stat', {...stat, xAxisScaleType: 'time', yAxisFormat: 'percentage', datasets: [
      {...dataset, interpolateGaps: true, dataPoints: [{x: '2026-11-01', y: '0'}, {x: '2026-11-08', y: '14'}]}
    ]});
    fixture.detectChanges();
    callbacks = chartConfig.mock.lastCall![0].options.plugins.tooltip.callbacks;
    expect(callbacks.afterLabel({datasetIndex: 0, dataIndex: 1})).toBe('Interpolated: 2');
    fixture.destroy();
  });

  it('preserves stacked pace totals, numeric axis units, and comparison legend behavior', async () => {
    await TestBed.configureTestingModule({imports: [ChartComponent]}).compileComponents();
    const fixture = TestBed.createComponent(ChartComponent);
    const datasets = [
      {label: 'Run', index: 0, filled: true, dataPoints: [{x: '1', y: '5:00'}]},
      {label: 'Other', index: 1, filled: true, dataPoints: [{x: '1', y: '6:00'}]}
    ];
    fixture.componentRef.setInput('stat', {...stat, xAxisUnit: ' km ', yAxisFormat: 'pace', stacked: true, datasets});
    fixture.detectChanges();
    let config = chartConfig.mock.lastCall![0];
    expect(config.data.datasets.map((dataset: {fill: string}) => dataset.fill)).toEqual(['origin', '-1']);
    expect(config.options.scales.y.stacked).toBe('single');
    expect(config.options.scales.y.title.text).toBe('Y (min/km)');
    expect(config.options.scales.y.ticks.callback(300)).toBe('5:00 /km');
    expect(config.options.scales.x.ticks.callback(1)).toBe('1 km');
    expect(config.options.plugins.tooltip.callbacks.title([{parsed: {x: 1}}])).toBe('1 km');
    expect(config.options.plugins.tooltip.callbacks.footer([{parsed: {y: 300}}, {parsed: {y: 360}}]))
      .toBe('Total: 11:00');

    fixture.componentRef.setInput('stat', {...stat, xAxisUnit: ' km ', yAxisFormat: 'pace',
      effortComparison: true, stacked: true, datasets});
    fixture.detectChanges();
    config = chartConfig.mock.lastCall![0];
    expect(config.options.scales.y.stacked).toBe(false);
    expect(config.options.plugins.tooltip.filter({datasetIndex: 2})).toBe(false);
    const chart = {isDatasetVisible: vi.fn().mockReturnValue(true), setDatasetVisibility: vi.fn(), update: vi.fn()};
    config.options.plugins.legend.onClick(null, {datasetIndex: 0}, {chart});
    expect(chart.setDatasetVisibility.mock.calls).toEqual([[0, false], [2, false]]);
    expect(chart.update).toHaveBeenCalledOnce();
    fixture.destroy();
  });

  it('formats interpolated and recorded numeric values with a trimmed dataset unit', async () => {
    await TestBed.configureTestingModule({imports: [ChartComponent]}).compileComponents();
    const fixture = TestBed.createComponent(ChartComponent);
    fixture.componentRef.setInput('stat', {...stat, xAxisScaleType: 'time', datasets: [
      {label: 'Balance', index: 0, unit: ' CHF ', smoothing: true, smoothingWindow: 1, interpolateGaps: true,
        dataPoints: [{x: '2026-11-01', y: '5'}, {x: '2026-11-08', y: '12'}]}
    ]});
    fixture.detectChanges();
    const callbacks = chartConfig.mock.lastCall![0].options.plugins.tooltip.callbacks;
    expect(callbacks.label({datasetIndex: 0, dataset: {label: 'Balance'}, formattedValue: '5'}))
      .toBe('Balance: 5 CHF');
    expect(callbacks.afterLabel({datasetIndex: 0, dataIndex: 0})).toBe('Recorded: 5 CHF');
    expect(callbacks.afterLabel({datasetIndex: 0, dataIndex: 1})).toBe('Interpolated: 6 CHF');
    fixture.destroy();
  });
});
