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
