import {ComponentFixture, TestBed} from '@angular/core/testing';

import {chartDataPoints, ChartComponent, effortTrendPoints} from './chart';
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

describe('Chart', () => {
  let component: ChartComponent;
  let fixture: ComponentFixture<ChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ChartComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  const stat: Stat = {id: 'weight', title: 'Weight', xAxisName: 'Date', yAxisName: 'kg', reverse: false, datasets: []};

  const datasets = [
    {label: 'Paid out', index: 0, dataPoints: [{x: '2026-09-30', y: '1000'}]},
    {label: 'Carried forward', index: 1, dataPoints: [{x: '2026-09-30', y: '391'}]}
  ];

  it('centers a seven-effort average with smaller edge windows and leaves measurements unchanged', () => {
    const points = Array.from({length: 9}, (_, index) => ({x: String(index + 1), y: String(index * 10)})).reverse();
    const original = JSON.stringify(points);
    expect(effortTrendPoints(points, {...stat, xAxisScaleType: 'linear', smoothing: true}).map(point => point.y))
      .toEqual([15, 20, 25, 30, 40, 50, 55, 60, 65]);
    expect(JSON.stringify(points)).toBe(original);
    expect(effortTrendPoints([], stat)).toEqual([]);
    expect(effortTrendPoints([{x: '2026-01-01', y: '42'}], stat)[0].y).toBe(42);
    const sparse = effortTrendPoints([{x: '2026-01-01', y: '10'}, {x: '2026-09-01', y: 'invalid'},
      {x: '2026-11-01', y: '30'}], stat);
    expect(sparse[0].y).toBe(20);
    expect(sparse[1].y).toBeNaN();
    expect(sparse[2].y).toBe(20);
  });

  it('overlays independent trends on raw dots and bypasses smoothing, fill and stacking', () => {
    const source = [
      {label: 'Run', index: 0, color: '10 20 30', filled: true,
        dataPoints: [{x: '2026-11-02', y: '5.11'}, {x: '2026-11-01', y: '4.59'}]},
      {label: 'Other route', index: 1, dataPoints: [{x: '2026-10-01', y: '6.00'}]}
    ];
    const original = JSON.stringify(source);
    fixture.componentRef.setInput('stat', {...stat, datasets: source, effortComparison: true,
      yAxisFormat: 'pace', smoothing: true, stacked: true, reverse: true});
    fixture.detectChanges();
    const config = chartConfig.mock.lastCall![0];
    expect(config.data.datasets).toHaveLength(4);
    const [dots, otherDots, trend, otherTrend] = config.data.datasets;
    expect(dots.data.map((point: {y: number}) => point.y)).toEqual([299, 311]);
    expect(dots.showLine).toBe(false);
    expect(dots.fill).toBe(false);
    expect(dots.pointRadius).toBe(2);
    expect(dots.pointHoverRadius).toBe(4);
    expect(dots.pointHitRadius).toBe(1);
    expect(dots.pointBackgroundColor).toBe('rgb(10 20 30 / 0.2)');
    expect(otherDots.data[0].y).toBe(360);
    expect(trend.data.map((point: {y: number}) => point.y)).toEqual([305, 305]);
    expect(otherTrend.data[0].y).toBe(360);
    expect(trend.borderColor).toBe(dots.borderColor);
    expect(trend.showLine).toBe(true);
    expect(trend.cubicInterpolationMode).toBe('monotone');
    expect(trend.pointRadius).toBe(0);
    expect(trend.fill).toBe(false);
    expect(config.options.scales.y.stacked).toBe(false);
    expect(config.options.scales.y.reverse).toBe(true);
    expect(config.options.scales.y.ticks.callback(305)).toBe('5:05 /km');
    const tooltip = config.options.plugins.tooltip;
    expect(tooltip.filter({datasetIndex: 0})).toBe(true);
    expect(tooltip.filter({datasetIndex: 2})).toBe(false);
    expect(tooltip.callbacks.label({dataset: {label: 'Run'}, parsed: {y: 299}})).toBe('Run: 4:59 /km');
    expect(tooltip.callbacks.afterLabel({datasetIndex: 0, dataIndex: 0})).toBe('');
    expect(tooltip.callbacks.footer).toBeUndefined();
    const emit = vi.spyOn(component.pointClick, 'emit');
    config.options.onClick(null, [{datasetIndex: 2, index: 0}]);
    expect(emit).not.toHaveBeenCalled();
    config.options.onClick(null, [{datasetIndex: 2, index: 0}, {datasetIndex: 0, index: 0}]);
    expect(emit).toHaveBeenCalledWith({datasetLabel: 'Run', point: source[0].dataPoints[1]});
    const legend = config.options.plugins.legend;
    expect(legend.labels.filter({datasetIndex: 2})).toBe(false);
    const chart = {isDatasetVisible: vi.fn().mockReturnValue(true), setDatasetVisibility: vi.fn(), update: vi.fn()};
    legend.onClick(null, {datasetIndex: 0}, {chart});
    expect(chart.setDatasetVisibility.mock.calls).toEqual([[0, false], [2, false]]);
    expect(chart.update).toHaveBeenCalledOnce();
    expect(JSON.stringify(source)).toBe(original);
  });

  it('keeps the original dot appearance when toggling Dots + trend', () => {
    for (const color of [undefined, '10 20 30']) {
      const source = [{label: 'Series', index: 0, color, dataPoints: [{x: '2026-11-01', y: '42'}]}];
      fixture.componentRef.setInput('stat', {...stat, datasets: source});
      fixture.detectChanges();
      const original = chartConfig.mock.lastCall![0].data.datasets[0];
      fixture.componentRef.setInput('stat', {...stat, datasets: source, effortComparison: true, smoothing: true});
      fixture.detectChanges();
      const dots = chartConfig.mock.lastCall![0].data.datasets[0];
      for (const property of ['pointRadius', 'pointHoverRadius', 'pointHitRadius', 'pointBackgroundColor',
        'borderColor', 'backgroundColor', 'borderWidth']) {
        expect(dots[property]).toEqual(original[property]);
      }
      expect(dots.showLine).toBe(false);
    }
  });

  it('ignores comparison on bars and restores saved line preferences when comparison is off', () => {
    for (const settings of [{chartType: 'bar' as const, effortComparison: true},
      {chartType: 'line' as const, effortComparison: false}]) {
      fixture.componentRef.setInput('stat', {...stat, ...settings, datasets, smoothing: true, stacked: true});
      fixture.detectChanges();
      const config = chartConfig.mock.lastCall![0];
      expect(config.data.datasets).toHaveLength(2);
      expect(config.options.scales.y.stacked).toBe(settings.chartType === 'bar' ? true : 'single');
      if (settings.chartType === 'line') expect(config.data.datasets[0].pointRadius).toBe(0);
    }
  });

  it('uses seconds for existing pace smoothing and formats recorded tooltip values', () => {
    fixture.componentRef.setInput('stat', {...stat, yAxisFormat: 'pace', smoothing: true, datasets: [
      {label: 'Run', index: 0, dataPoints: [{x: '2026-11-01', y: '4.59'}, {x: '2026-11-02', y: '5.11'}]}
    ]});
    fixture.detectChanges();
    const config = chartConfig.mock.lastCall![0];
    expect(config.data.datasets[0].data[1].y).toBe(305);
    expect(config.options.plugins.tooltip.callbacks.afterLabel({datasetIndex: 0, dataIndex: 1}))
      .toBe('Recorded: 5:11 /km');
  });

  it('renders stacked bars with exact contributions even when smoothing is stored', () => {
    fixture.componentRef.setInput('stat', {...stat, chartType: 'bar', stacked: true, smoothing: true,
      yAxisMin: 0, datasets: [
        {label: 'Main unsuccessful', index: 0, dataPoints: [{x: '2026-11-03', y: '100'}, {x: '2026-11-10', y: '300'}]},
        {label: 'Small unsuccessful', index: 1, dataPoints: [{x: '2026-11-10', y: '200'}]},
        {label: 'Shinies', index: 2, dataPoints: [{x: '2026-11-10', y: '5'}]}
      ]});
    fixture.detectChanges();
    const config = chartConfig.mock.lastCall![0];
    expect(config.type).toBe('bar');
    expect(config.options.scales.x.stacked).toBe(true);
    expect(config.options.scales.x.offset).toBe(true);
    expect(config.options.scales.y.stacked).toBe(true);
    expect(config.data.datasets.map((dataset: {data: {y: number | null}[]}) => dataset.data[1].y))
      .toEqual([300, 200, 5]);
    expect(config.data.datasets[1].data[0].y).toBeNull();
    expect(config.data.datasets[0].fill).toBeUndefined();
    expect(config.options.plugins.tooltip.callbacks.footer([
      {parsed: {y: 300}}, {parsed: {y: 200}}, {parsed: {y: 5}}
    ])).toBe('Total: 505');
    expect(config.options.plugins.tooltip.callbacks.afterLabel({datasetIndex: 0, dataIndex: 1})).toBe('');
    const emit = vi.spyOn(component.pointClick, 'emit');
    config.options.onClick(null, [{datasetIndex: 1, index: 0}]);
    expect(emit).not.toHaveBeenCalled();
    config.options.onClick(null, [{datasetIndex: 1, index: 1}]);
    expect(emit).toHaveBeenCalledWith({datasetLabel: 'Small unsuccessful', point: {x: '2026-11-10', y: '200'}});
  });

  it('keeps bars grouped when stacking is off and aligns numeric values without changing saved points', () => {
    const source = [
      {label: 'Main', index: 0, dataPoints: [{x: '10', y: '300'}, {x: '2', y: '100'}]},
      {label: 'Shinies', index: 1, dataPoints: [{x: '10', y: '0'}]}
    ];
    const original = JSON.stringify(source);
    fixture.componentRef.setInput('stat', {...stat, chartType: 'bar', stacked: false,
      xAxisScaleType: 'linear', xAxisUnit: 'km', datasets: source});
    fixture.detectChanges();
    const config = chartConfig.mock.lastCall![0];
    expect(config.type).toBe('bar');
    expect(config.options.scales.x.stacked).toBe(false);
    expect(config.options.scales.y.stacked).toBe(false);
    expect(config.options.scales.x.type).toBe('linear');
    expect(config.options.scales.x.suggestedMin).toBe(-2);
    expect(config.options.scales.x.suggestedMax).toBe(14);
    expect(config.data.datasets[0].data).toEqual([{x: 2, y: 100}, {x: 10, y: 300}]);
    expect(config.data.datasets[1].data).toEqual([{x: 2, y: null}, {x: 10, y: 0}]);
    expect(config.options.plugins.tooltip.callbacks.footer).toBeUndefined();
    expect(JSON.stringify(source)).toBe(original);
  });

  it('supports empty and single-dataset bars and restores line rendering when switched back', () => {
    for (const source of [[], datasets.slice(0, 1)]) {
      fixture.componentRef.setInput('stat', {...stat, chartType: 'bar', stacked: true, datasets: source});
      fixture.detectChanges();
      const config = chartConfig.mock.lastCall![0];
      expect(config.type).toBe('bar');
      expect(config.options.scales.y.stacked).toBe(false);
      expect(config.data.datasets).toHaveLength(source.length);
    }
    for (const chartType of [undefined, 'line'] as const) {
      fixture.componentRef.setInput('stat', {...stat, chartType, smoothing: true, datasets});
      fixture.detectChanges();
      const config = chartConfig.mock.lastCall![0];
      expect(config.type).toBe('line');
      expect(config.options.scales.x.stacked).toBeUndefined();
      expect(config.data.datasets[0].pointRadius).toBe(0);
    }
  });

  it('uses automatic bounds independently of stacking, smoothing, axis direction and X axis type', () => {
    for (const stacked of [false, true]) {
      for (const reverse of [false, true]) {
        for (const xAxisScaleType of ['time', 'linear'] as const) {
          const source = datasets.map(ds => ({...ds, dataPoints: [{x: xAxisScaleType === 'linear' ? '1' : '2026-09-30', y: '-50'}]}));
          fixture.componentRef.setInput('stat', {...stat, datasets: source, stacked, reverse, xAxisScaleType,
            smoothing: true});
          fixture.detectChanges();
          const config = chartConfig.mock.lastCall![0];
          expect(config.options.scales.y.beginAtZero).toBe(false);
          expect(config.options.scales.y.reverse).toBe(reverse);
          expect(config.options.scales.y.stacked).toBe(stacked ? 'single' : false);
          expect(config.options.scales.y.min).toBeUndefined();
          expect(config.options.scales.y.max).toBeUndefined();
          expect(config.data.datasets[0].data[0].y).toBe(-50);
        }
      }
    }
  });

  it('applies optional fixed bounds across chart types, direction, stacking and pace without altering data', () => {
    for (const chartType of ['line', 'bar'] as const) {
      for (const reverse of [false, true]) {
        for (const effortComparison of [false, true]) {
          for (const bounds of [{}, {yAxisMin: null, yAxisMax: null}, {yAxisMin: 0},
            {yAxisMax: -5}, {yAxisMin: -100, yAxisMax: 500}]) {
            const source: Stat = {...stat, chartType, reverse, effortComparison, stacked: true,
              smoothing: true, yAxisFormat: 'pace', datasets, ...bounds};
            const original = JSON.stringify(source);
            fixture.componentRef.setInput('stat', source);
            fixture.detectChanges();
            const scale = chartConfig.mock.lastCall![0].options.scales.y;
            expect(scale.min).toBe(source.yAxisMin ?? undefined);
            expect(scale.max).toBe(source.yAxisMax ?? undefined);
            expect(scale.beginAtZero).toBe(false);
            expect(scale.reverse).toBe(reverse);
            expect(JSON.stringify(source)).toBe(original);
          }
        }
      }
    }
  });

  it('stacks matching X values without replacing contributions or changing saved measurements', () => {
    const original = JSON.stringify(datasets);
    for (const xAxisScaleType of ['time', 'linear'] as const) {
      const source = xAxisScaleType === 'linear'
        ? datasets.map(ds => ({...ds, dataPoints: ds.dataPoints.map(point => ({...point, x: '2'}))}))
        : datasets;
      for (const stacked of [true, false]) {
        fixture.componentRef.setInput('stat', {...stat, datasets: source, stacked, xAxisScaleType});
        fixture.detectChanges();
        const config = chartConfig.mock.lastCall![0];
        expect(config.options.scales.y.stacked).toBe(stacked ? 'single' : false);
        expect(config.data.datasets[0].data[0].x).toBe(xAxisScaleType === 'linear' ? 2 : '2026-09-30');
        expect(config.data.datasets.map((dataset: {data: {y: number}[]}) => dataset.data[0].y)).toEqual([1000, 391]);
        if (stacked) {
          expect(config.options.plugins.tooltip.callbacks.footer([
            {parsed: {y: 1000}}, {parsed: {y: 391}}
          ])).toBe('Total: 1391');
          expect(config.options.plugins.tooltip.callbacks.footer([{parsed: {y: 1000}}])).toBe('Total: 1000');
        } else {
          expect(config.options.plugins.tooltip.callbacks.footer).toBeUndefined();
        }
      }
    }
    expect(JSON.stringify(datasets)).toBe(original);
  });

  it('does not combine different X values in a tooltip', () => {
    fixture.componentRef.setInput('stat', {...stat, datasets, stacked: true});
    fixture.detectChanges();
    const tooltip = chartConfig.mock.lastCall![0].options.plugins.tooltip;
    const items = [{parsed: {x: 1, y: 1000}}, {parsed: {x: 2, y: 391}}];
    expect(tooltip.mode).toBe('nearest');
    expect(tooltip.axis).toBe('x');
    expect(tooltip.filter(items[0], 0, items)).toBe(true);
    expect(tooltip.filter(items[1], 1, items)).toBe(false);
  });

  it('requires at least two datasets to render a stack and leaves legacy charts unstacked', () => {
    for (const settings of [{datasets}, {datasets: datasets.slice(0, 1), stacked: true}, {datasets: [], stacked: true}]) {
      fixture.componentRef.setInput('stat', {...stat, ...settings});
      fixture.detectChanges();
      expect(chartConfig.mock.lastCall![0].options.scales.y.stacked).toBe(false);
    }
  });

  it('fills between stacked lines only when dataset filling is enabled and preserves point selection', () => {
    fixture.componentRef.setInput('stat', {...stat, datasets: datasets.map(ds => ({...ds, filled: true})), stacked: true});
    fixture.detectChanges();
    const config = chartConfig.mock.lastCall![0];
    expect(config.data.datasets.map((ds: {fill: string}) => ds.fill)).toEqual(['origin', '-1']);
    const emit = vi.spyOn(component.pointClick, 'emit');
    config.options.onClick(null, [{datasetIndex: 1, index: 0}]);
    expect(emit).toHaveBeenCalledWith({datasetLabel: 'Carried forward', point: datasets[1].dataPoints[0]});
    expect(config.options.interaction).toBeUndefined();
  });

  it('hides normal and hover dots only when smoothing is enabled, while retaining hit detection', () => {
    for (const smoothing of [false, true, false]) {
      fixture.componentRef.setInput('stat', {...stat, smoothing, datasets: [{label: 'Weight', index: 0,
        dataPoints: [{x: '2026-10-30', y: '64'}]}]});
      fixture.detectChanges();
      const dataset = chartConfig.mock.lastCall![0].data.datasets[0];
      expect(dataset.pointRadius).toBe(smoothing ? 0 : 2);
      expect(dataset.pointHoverRadius).toBe(smoothing ? 0 : 4);
      expect(dataset.pointHitRadius).toBe(smoothing ? 6 : 1);
    }
  });

  it('keeps unsmoothed values and orders points chronologically', () => {
    expect(chartDataPoints([{x: '2026-10-02', y: '80'}, {x: '2026-10-01', y: '60'}], stat))
      .toEqual([{x: '2026-10-01', y: 60}, {x: '2026-10-02', y: 80}]);
  });

  it('uses a trailing seven-measurement average without changing recorded points', () => {
    const points = Array.from({length: 8}, (_, index) => ({x: `2026-10-0${index + 1}`, y: String(index * 10)}));
    const original = JSON.stringify(points);
    const displayed = chartDataPoints(points, {...stat, smoothing: true});
    expect(displayed.map(point => point.y)).toEqual([0, 5, 10, 15, 20, 25, 30, 40]);
    expect(JSON.stringify(points)).toBe(original);
    expect(chartDataPoints(points, stat).map(point => point.y)).toEqual(points.map(point => Number(point.y)));
  });

  it('supports independent datasets, sparse dates and numeric axes', () => {
    expect(chartDataPoints([{x: '2026-01-01', y: '60'}, {x: '2026-10-30', y: '80'}], {...stat, smoothing: true})[1].y).toBe(70);
    expect(chartDataPoints([{x: '10', y: '8'}, {x: '2', y: '4'}], {...stat, smoothing: true, xAxisScaleType: 'linear'}))
      .toEqual([{x: 2, y: 4}, {x: 10, y: 6}]);
    expect(chartDataPoints([{x: '2026-10-01', y: '100'}], {...stat, smoothing: true})[0].y).toBe(100);
    expect(chartDataPoints([], {...stat, smoothing: true})).toEqual([]);
  });

  it('preserves invalid-value gaps without poisoning subsequent averages', () => {
    const displayed = chartDataPoints([{x: '2026-10-01', y: '60'}, {x: '2026-10-02', y: 'invalid'},
      {x: '2026-10-03', y: '80'}], {...stat, smoothing: true});
    expect(displayed[1].y).toBeNaN();
    expect(displayed[2].y).toBe(70);
  });
});
