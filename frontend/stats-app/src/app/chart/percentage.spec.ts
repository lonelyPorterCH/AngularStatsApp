import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {HttpTestingController, provideHttpClientTesting} from '@angular/common/http/testing';
import {ActivatedRoute, convertToParamMap, provideRouter} from '@angular/router';
import {of} from 'rxjs';
import {ChartComponent} from './chart';
import {StatEdit} from '../stat-edit/stat-edit';
import {Stat} from '../models/stat';
import {environment} from '../../environments/environment';

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

describe('Percentage value format', () => {
  let fixture: ComponentFixture<ChartComponent>;
  const stat: Stat = {id: 'progress', title: 'Progress', xAxisName: 'Date', yAxisName: 'Progress',
    reverse: false, yAxisFormat: 'percentage', datasets: []};

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ChartComponent, StatEdit],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([]),
        {provide: ActivatedRoute, useValue: {paramMap: of(convertToParamMap({}))}}]
    }).compileComponents();
    fixture = TestBed.createComponent(ChartComponent);
  });

  it('plots each dataset against its own target for lines, bars and trends while retaining counts', () => {
    const source = [
      {label: 'Lucky trades', index: 0, percentageTarget: 50, dataPoints: [
        {x: '2026-11-14', y: '0'}, {x: '2026-11-16', y: '6'}
      ]},
      {label: 'Rocket leaders', index: 1, percentageTarget: 30, dataPoints: [{x: '2026-11-16', y: '3'}]},
      {label: 'Eggs', index: 2, percentageTarget: 100, dataPoints: [{x: '2026-11-16', y: '7'}]}
    ];
    const original = JSON.stringify(source);
    for (const settings of [{chartType: 'line'}, {chartType: 'bar'}, {effortComparison: true}] as const) {
      fixture.componentRef.setInput('stat', {...stat, ...settings, yAxisMin: 0, yAxisMax: 100, datasets: source});
      fixture.detectChanges();
      const config = chartConfig.mock.lastCall![0];
      expect(config.data.datasets[0].data.map((point: {y: number}) => point.y)).toEqual([0, 12]);
      expect(config.data.datasets[1].data.at(-1).y).toBe(10);
      expect(config.data.datasets[2].data.at(-1).y).toBeCloseTo(7);
      if ('effortComparison' in settings) {
        expect(config.data.datasets[3].data.map((point: {y: number}) => point.y)).toEqual([6, 6]);
      }
      expect(config.options.scales.y.min).toBe(0);
      expect(config.options.scales.y.max).toBe(100);
      expect(config.options.scales.y.ticks.callback(10.5)).toBe('10.5%');
      expect(config.options.scales.y.title.text).toBe('Progress (%)');
      expect(config.options.plugins.tooltip.callbacks.label({
        datasetIndex: 0, dataIndex: 1, parsed: {y: 12}
      })).toBe('Lucky trades: 6 / 50');
      const emit = vi.spyOn(fixture.componentInstance.pointClick, 'emit');
      config.options.onClick(null, [{datasetIndex: 0, index: 1}]);
      expect(emit).toHaveBeenLastCalledWith({datasetLabel: 'Lucky trades', point: source[0].dataPoints[1]});
    }
    expect(JSON.stringify(source)).toBe(original);
  });

  it('shows smoothed, recorded and interpolated counts without summing unrelated targets', () => {
    fixture.componentRef.setInput('stat', {...stat, stacked: true, datasets: [
      {label: 'Progress', index: 0, percentageTarget: 50, smoothing: true, smoothingWindow: 2, interpolateGaps: true,
        dataPoints: [{x: '2026-11-01', y: '0'}, {x: '2026-11-08', y: '14'}]},
      {label: 'Other', index: 1, dataPoints: [{x: '2026-11-08', y: '20'}]}
    ]});
    fixture.detectChanges();
    const config = chartConfig.mock.lastCall![0];
    expect(config.data.datasets[0].data[7].y).toBe(26);
    const callbacks = config.options.plugins.tooltip.callbacks;
    expect(callbacks.label({datasetIndex: 0, dataIndex: 7, parsed: {y: 26}})).toBe('Progress: 13 / 50');
    expect(callbacks.afterLabel({datasetIndex: 0, dataIndex: 7})).toBe('Recorded: 14');
    expect(callbacks.afterLabel({datasetIndex: 0, dataIndex: 1})).toBe('Interpolated: 2');
    expect(callbacks.footer).toBeUndefined();
    expect(config.options.scales.y.min).toBeUndefined();
    expect(config.options.scales.y.max).toBeUndefined();
  });

  it('recalculates after target changes, allows exceeding the target and ignores targets in number mode', () => {
    const dataset = {label: 'Lucky trades', index: 0, dataPoints: [{x: '2026-11-16', y: '60'}]};
    for (const [percentageTarget, expected] of [[undefined, 60], [50, 120], [30, 200]] as const) {
      fixture.componentRef.setInput('stat', {...stat, datasets: [{...dataset, percentageTarget}]});
      fixture.detectChanges();
      expect(chartConfig.mock.lastCall![0].data.datasets[0].data[0].y).toBe(expected);
    }
    fixture.componentRef.setInput('stat', {...stat, yAxisFormat: 'number',
      datasets: [{...dataset, percentageTarget: 50}]});
    fixture.detectChanges();
    expect(chartConfig.mock.lastCall![0].data.datasets[0].data[0].y).toBe(60);
    expect(dataset.dataPoints[0].y).toBe('60');
  });

  it('switches an existing chart without changing measurements or bounds', async () => {
    const editFixture = TestBed.createComponent(StatEdit);
    await editFixture.whenStable();
    const component = editFixture.componentInstance;
    const http = TestBed.inject(HttpTestingController);
    const datasets = [{label: 'Progress', index: 0, dataPoints: [{x: '2026-11-16', y: '10'}]}];
    component.stat.set({...stat, yAxisFormat: 'number', datasets, yAxisMin: 0, yAxisMax: 100});
    component.onYAxisFormatChange('percentage');
    const request = http.expectOne(`${environment.apiBaseUrl}/progress/y-axis-format`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({yAxisFormat: 'percentage'});
    request.flush(null);
    expect(component.stat()).toMatchObject({yAxisFormat: 'percentage', yAxisMin: 0, yAxisMax: 100, datasets});
    expect(component.yAxisFormatSaving()).toBe(false);
    http.verify();
  });
});
