import {ComponentFixture, TestBed} from '@angular/core/testing';
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
});
