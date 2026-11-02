import {ComponentFixture, TestBed} from '@angular/core/testing';

import {chartDataPoints, ChartComponent} from './chart';
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

  it('includes zero independently of stacking, smoothing, axis direction and X axis type', () => {
    for (const stacked of [false, true]) {
      for (const reverse of [false, true]) {
        for (const xAxisScaleType of ['time', 'linear'] as const) {
          for (const includeZero of [undefined, true, false]) {
            const source = datasets.map(ds => ({...ds, dataPoints: [{x: xAxisScaleType === 'linear' ? '1' : '2026-09-30', y: '-50'}]}));
            fixture.componentRef.setInput('stat', {...stat, datasets: source, stacked, reverse, xAxisScaleType,
              smoothing: true, includeZero});
            fixture.detectChanges();
            const config = chartConfig.mock.lastCall![0];
            expect(config.options.scales.y.beginAtZero).toBe(includeZero ?? false);
            expect(config.options.scales.y.reverse).toBe(reverse);
            expect(config.options.scales.y.stacked).toBe(stacked ? 'single' : false);
            expect(config.options.scales.y.min).toBeUndefined();
            expect(config.options.scales.y.max).toBeUndefined();
            expect(config.data.datasets[0].data[0].y).toBe(-50);
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
