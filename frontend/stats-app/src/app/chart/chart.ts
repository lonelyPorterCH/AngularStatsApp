import {AfterViewInit, Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, viewChild} from '@angular/core';
import {Chart, ChartDataset, ChartOptions, registerables, TooltipItem} from 'chart.js';
import 'chartjs-adapter-luxon';
import {DateTime} from 'luxon';
import {DataPoint, Dataset, Stat} from '../models/stat';
import {compareDataPoints, isLinearXAxis, parseXAxisValue} from '../models/x-axis';
import {DEFAULT_DATASET_COLORS} from '../models/dataset-colors';
import {formatPace, parseYAxisValue} from '../models/y-axis';

Chart.register(...registerables);

type ChartCoordinate = {x: string | number; y: number | null};
type ChartSample = {x: string | number; y: number; rawY: number; recorded?: DataPoint};

export interface ChartPointClickEvent {
  datasetLabel: string;
  point: DataPoint;
}

function prepareLinePoints(points: DataPoint[], stat: Stat, smoothing: boolean, smoothingWindow: number,
                           interpolateGaps: boolean): ChartSample[] {
  const sorted = [...points].sort((first, second) => compareDataPoints(first, second, stat));
  const samples: ChartSample[] = [];
  sorted.forEach((point, index) => {
    const rawY = parseYAxisValue(point.y, stat);
    samples.push({x: parseXAxisValue(point.x, stat), y: rawY, rawY, recorded: point});
    const next = sorted[index + 1];
    if (!next || !smoothing || !interpolateGaps || isLinearXAxis(stat) || stat.chartType === 'bar') return;
    const nextY = parseYAxisValue(next.y, stat);
    if (!Number.isFinite(rawY) || !Number.isFinite(nextY)) return;
    const start = DateTime.fromISO(point.x).startOf('day');
    const end = DateTime.fromISO(next.x).startOf('day');
    if (!start.isValid || !end.isValid) return;
    const days = end.diff(start, 'days').days;
    if (days < 7) return;
    for (let day = 1; day < days; day++) {
      const x = start.plus({days: day}).toISODate();
      if (x) {
        const value = rawY + (nextY - rawY) * day / days;
        samples.push({x, y: value, rawY: value});
      }
    }
  });
  const values = samples.map(sample => sample.rawY);
  return samples.map((sample, index) => {
    const window = values.slice(Math.max(0, index - smoothingWindow + 1), index + 1).filter(Number.isFinite);
    const value = stat.chartType !== 'bar' && smoothing && Number.isFinite(values[index])
      ? window.reduce((total, measurement) => total + measurement, 0) / window.length
      : values[index];
    return {...sample, y: value};
  });
}

export function chartDataPoints(points: DataPoint[], stat: Stat, smoothing: boolean = false, smoothingWindow = 7): {x: string | number; y: number}[] {
  return prepareLinePoints(points, stat, smoothing, smoothingWindow, false).map(({x, y}) => ({x, y}));
}

export function effortTrendPoints(points: DataPoint[], stat: Stat): {x: string | number; y: number}[] {
  const raw = chartDataPoints(points, stat, false);
  return raw.map((point, index) => {
    const window = raw.slice(Math.max(0, index - 3), index + 4)
      .map(value => value.y).filter(Number.isFinite);
    return {...point, y: Number.isFinite(point.y)
      ? window.reduce((sum, value) => sum + value, 0) / window.length : Number.NaN};
  });
}

type ChartContext = {
  stat: Stat;
  bar: boolean;
  comparison: boolean;
  pace: boolean;
  percentage: boolean;
  linearXAxis: boolean;
  stacked: boolean;
  linePoints: ChartSample[][];
  sourcePoints: (DataPoint | undefined)[][];
  xValues: (string | number)[];
  xAxisUnit: string;
  xAxisTitle: string;
  barBounds: {suggestedMin?: number; suggestedMax?: number};
  colors: string[];
};

function getBarBounds(xValues: (string | number)[], linearXAxis: boolean): ChartContext['barBounds'] {
  const coordinates = [...new Set(xValues.map(value => linearXAxis
    ? Number(value) : DateTime.fromISO(String(value)).toMillis()).filter(Number.isFinite))]
    .sort((first, second) => first - second);
  if (!coordinates.length) return {};
  const minimumGap = coordinates.slice(1).reduce((gap, value, index) =>
    Math.min(gap, value - coordinates[index]), Infinity);
  const defaultGap = linearXAxis ? 1 : 86_400_000;
  const padding = (Number.isFinite(minimumGap) ? minimumGap : defaultGap) / 2;
  return {suggestedMin: coordinates[0] - padding, suggestedMax: coordinates.at(-1)! + padding};
}

function createChartContext(stat: Stat): ChartContext {
  const bar = stat.chartType === 'bar';
  const comparison = !bar && !!stat.effortComparison;
  const linearXAxis = isLinearXAxis(stat);
  const sortedPoints = stat.datasets.map(dataset =>
    [...dataset.dataPoints].sort((first, second) => compareDataPoints(first, second, stat)));
  const linePoints = stat.datasets.map(dataset => prepareLinePoints(dataset.dataPoints, stat,
    !bar && !comparison && !!dataset.smoothing, dataset.smoothingWindow ?? 7, !!dataset.interpolateGaps));
  const xValues = [...new Set(sortedPoints.flat().map(point => parseXAxisValue(point.x, stat)))]
    .sort((first, second) => compareDataPoints({x: String(first), y: ''}, {x: String(second), y: ''}, stat));
  const sourcePoints = bar ? sortedPoints.map(points => {
    const byX = new Map(points.map(point => [parseXAxisValue(point.x, stat), point]));
    return xValues.map(x => byX.get(x));
  }) : linePoints.map(points => points.map(point => point.recorded));
  const xAxisUnit = linearXAxis ? stat.xAxisUnit?.trim() ?? '' : '';
  return {
    stat, bar, comparison, linearXAxis, linePoints, sourcePoints, xValues, xAxisUnit,
    pace: stat.yAxisFormat === 'pace',
    percentage: stat.yAxisFormat === 'percentage',
    stacked: !comparison && !!stat.stacked && stat.datasets.length >= 2,
    xAxisTitle: xAxisUnit ? `${stat.xAxisName} (${xAxisUnit})` : stat.xAxisName,
    barBounds: bar ? getBarBounds(xValues, linearXAxis) : {},
    colors: stat.datasets.map((dataset, index) =>
      dataset.color || DEFAULT_DATASET_COLORS[index % DEFAULT_DATASET_COLORS.length])
  };
}

function chartY(value: number, dataset: Dataset, percentage: boolean): number {
  return percentage ? value / (dataset.percentageTarget ?? 100) * 100 : value;
}

function lineFill(dataset: Dataset, context: ChartContext, index: number): string | false {
  if (context.comparison || !dataset.filled) return false;
  return context.stacked && index > 0 ? '-1' : 'origin';
}

function datasetPoints(context: ChartContext, dataset: Dataset, index: number): ChartCoordinate[] {
  if (!context.bar) {
    return context.linePoints[index].map(({x, y}) => ({x, y: chartY(y, dataset, context.percentage)}));
  }
  return context.sourcePoints[index].map((point, pointIndex) => ({
    x: context.xValues[pointIndex],
    y: point ? chartY(parseYAxisValue(point.y, context.stat), dataset, context.percentage) : null
  }));
}

function createDatasets(context: ChartContext): ChartDataset<'line' | 'bar', ChartCoordinate[]>[] {
  const {stat, bar, comparison, colors, percentage} = context;
  const datasets: ChartDataset<'line' | 'bar', ChartCoordinate[]>[] = stat.datasets.map((dataset, index) => {
    const color = colors[index];
    const smoothing = !bar && !comparison && !!dataset.smoothing;
    return {
      label: dataset.label,
      data: datasetPoints(context, dataset, index),
      ...(!bar ? {
        showLine: !comparison,
        fill: lineFill(dataset, context, index),
        tension: 0,
        cubicInterpolationMode: smoothing ? 'monotone' as const : 'default' as const,
        pointRadius: smoothing ? 0 : 2,
        pointHoverRadius: smoothing ? 0 : 4,
        pointHitRadius: smoothing ? 6 : 1,
        pointBackgroundColor: `rgb(${color} / 0.2)`,
      } : {}),
      borderWidth: 1,
      borderColor: `rgb(${color} / 0.85)`,
      backgroundColor: `rgb(${color} / ${bar ? 0.85 : 0.2})`,
    };
  });
  if (comparison) {
    datasets.push(...stat.datasets.map((dataset, index): ChartDataset<'line' | 'bar', ChartCoordinate[]> => ({
      label: `${dataset.label} - trend`,
      data: effortTrendPoints(dataset.dataPoints, stat).map(({x, y}) => ({x, y: chartY(y, dataset, percentage)})),
      borderColor: `rgb(${colors[index]} / 0.85)`,
      backgroundColor: `rgb(${colors[index]} / 0.2)`,
      borderWidth: 2,
      showLine: true,
      fill: false,
      cubicInterpolationMode: 'monotone',
      pointRadius: 0,
      pointHoverRadius: 0,
      pointHitRadius: 0,
      order: 1,
    })));
  }
  return datasets;
}

function withUnit(value: string | number, unit: string | undefined): string {
  const suffix = unit?.trim();
  return suffix ? `${value} ${suffix}` : String(value);
}

function percentageCount(context: ChartContext, item: TooltipItem<'line' | 'bar'>,
                         countFormat: Intl.NumberFormat): string | undefined {
  const dataset = context.stat.datasets[item.datasetIndex];
  const sample = context.linePoints[item.datasetIndex]?.[item.dataIndex];
  if (context.bar) return context.sourcePoints[item.datasetIndex]?.[item.dataIndex]?.y;
  if (sample?.recorded && (!dataset.smoothing || context.comparison)) return sample.recorded.y;
  return sample === undefined ? undefined : countFormat.format(sample.y);
}

function tooltipLabel(context: ChartContext, item: TooltipItem<'line' | 'bar'>,
                      countFormat: Intl.NumberFormat): string {
  if (context.pace) {
    const value = item.parsed.y === null ? '' : formatPace(item.parsed.y);
    return `${item.dataset.label}: ${value} /km`;
  }
  if (context.percentage) {
    const dataset = context.stat.datasets[item.datasetIndex];
    const count = percentageCount(context, item, countFormat);
    const value = item.parsed.y === null || count === undefined ? '' : `${count} / ${dataset.percentageTarget ?? 100}`;
    return `${dataset.label}: ${value}`;
  }
  const unit = context.stat.datasets[item.datasetIndex]?.unit;
  return `${item.dataset.label}: ${withUnit(item.formattedValue, unit)}`;
}

function tooltipAfterLabel(context: ChartContext, item: TooltipItem<'line' | 'bar'>,
                           countFormat: Intl.NumberFormat): string {
  const dataset = context.stat.datasets[item.datasetIndex];
  if (!dataset?.smoothing || context.bar || context.comparison) return '';
  const sample = context.linePoints[item.datasetIndex]?.[item.dataIndex];
  if (!sample) return '';
  const label = sample.recorded ? 'Recorded' : 'Interpolated';
  if (context.pace) return `${label}: ${formatPace(sample.rawY)} /km`;
  if (context.percentage) {
    const value = sample.recorded ? sample.recorded.y : countFormat.format(sample.rawY);
    return `${label}: ${value}`;
  }
  const value = sample.recorded ? sample.recorded.y : sample.rawY;
  return `${label}: ${withUnit(value, dataset.unit)}`;
}

function createTooltip(context: ChartContext): NonNullable<ChartOptions<'line' | 'bar'>['plugins']>['tooltip'] {
  const countFormat = new Intl.NumberFormat(undefined, {maximumFractionDigits: 2});
  return {
    ...(context.comparison ? {
      filter: (item: TooltipItem<'line' | 'bar'>) => item.datasetIndex < context.stat.datasets.length
    } : {}),
    ...(context.stacked ? {
      mode: context.bar ? 'index' as const : 'nearest' as const,
      axis: 'x' as const,
      intersect: false,
      filter: (item: TooltipItem<'line' | 'bar'>, _index: number, items: TooltipItem<'line' | 'bar'>[]) =>
        item.parsed.x === items[0]?.parsed.x
    } : {}),
    callbacks: {
      ...(context.stacked && !context.percentage ? {
        footer: (items: {parsed: {y: number | null}}[]) => {
          const total = items.reduce((sum, item) => sum + (item.parsed.y ?? 0), 0);
          return `Total: ${context.pace ? formatPace(total) : total}`;
        }
      } : {}),
      label: item => tooltipLabel(context, item, countFormat),
      ...(context.linearXAxis ? {
        title: (items: {parsed: {x: number | null}}[]) => withUnit(items[0]?.parsed.x ?? '', context.xAxisUnit)
      } : {}),
      afterLabel: item => tooltipAfterLabel(context, item, countFormat)
    }
  };
}

function yAxisTitle(context: ChartContext): string {
  if (context.pace) return `${context.stat.yAxisName} (min/km)`;
  if (context.percentage) return `${context.stat.yAxisName} (%)`;
  return context.stat.yAxisName;
}

function createScales(context: ChartContext): ChartOptions<'line' | 'bar'>['scales'] {
  const {stat, bar, stacked, linearXAxis, xAxisUnit, pace, percentage} = context;
  const lineStacked = stacked ? 'single' as const : false;
  let ticks = {};
  if (pace) ticks = {callback: (value: string | number) => `${formatPace(Number(value))} /km`};
  else if (percentage) ticks = {callback: (value: string | number) => `${value}%`};
  return {
    x: {
      type: linearXAxis ? 'linear' : 'time',
      ...(bar ? {stacked, offset: true, ...context.barBounds} : {}),
      ticks: {
        maxTicksLimit: 6,
        ...(linearXAxis ? {callback: (value: string | number) => withUnit(value, xAxisUnit)} : {})
      },
      ...(linearXAxis ? {} : {time: {tooltipFormat: 'DD'}}),
      title: {display: true, text: context.xAxisTitle}
    },
    y: {
      beginAtZero: false,
      min: stat.yAxisMin ?? undefined,
      max: stat.yAxisMax ?? undefined,
      stacked: bar ? stacked : lineStacked,
      reverse: stat.reverse,
      ...(pace || percentage ? {ticks} : {}),
      title: {display: true, text: yAxisTitle(context)}
    }
  };
}

@Component({
  selector: 'app-chart',
  template: '<canvas #canvas></canvas>',
  styleUrl: './chart.css'
})
export class ChartComponent implements OnChanges, AfterViewInit, OnDestroy {

  @Input() stat!: Stat;
  @Output() pointClick = new EventEmitter<ChartPointClickEvent>();
  canvas = viewChild.required<ElementRef>('canvas');
  private chart?: Chart<'line' | 'bar', ChartCoordinate[]>;
  private viewInitialized = false;

  ngAfterViewInit(): void {
    this.viewInitialized = true;
    this.buildChart();
  }

  ngOnChanges(): void {
    if (this.viewInitialized) {
      this.buildChart();
    }
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private buildChart(): void {
    if (!this.stat) return;
    this.chart?.destroy();
    const context = createChartContext(this.stat);
    this.chart = new Chart<'line' | 'bar', ChartCoordinate[]>(this.canvas().nativeElement, {
      type: context.bar ? 'bar' : 'line',
      data: {datasets: createDatasets(context)},
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          ...(context.comparison ? {
            legend: {
              labels: {filter: (item: {datasetIndex?: number}) => (item.datasetIndex ?? 0) < this.stat.datasets.length},
              onClick: (_event: unknown, item: {datasetIndex?: number},
                legend: {chart: {
                  isDatasetVisible(index: number): boolean;
                  setDatasetVisibility(index: number, visible: boolean): void;
                  update(): void;
                }}) => {
                if (item.datasetIndex === undefined) return;
                const visible = !legend.chart.isDatasetVisible(item.datasetIndex);
                legend.chart.setDatasetVisibility(item.datasetIndex, visible);
                legend.chart.setDatasetVisibility(item.datasetIndex + this.stat.datasets.length, visible);
                legend.chart.update();
              }
            }
          } : {}),
          tooltip: createTooltip(context)
        },
        onClick: (_event, elements) => {
          if (elements.length > 0) {
            const el = elements.find(element => element.datasetIndex < this.stat.datasets.length
              && context.sourcePoints[element.datasetIndex]?.[element.index]);
            if (!el) return;
            const ds = this.stat.datasets[el.datasetIndex];
            const point = context.sourcePoints[el.datasetIndex]?.[el.index];
            if (ds && point) {
              this.pointClick.emit({datasetLabel: ds.label, point});
            }
          }
        },
        scales: createScales(context)
      }
    });
  }
}
