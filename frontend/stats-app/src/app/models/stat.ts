export interface Stat {
  id: string;
  title: string;
  xAxisName: string;
  yAxisName: string;
  chartType?: 'line' | 'bar';
  xAxisScaleType?: 'time' | 'linear';
  xAxisUnit?: string;
  reverse: boolean;
  effortComparison?: boolean;
  yAxisFormat?: 'number' | 'pace';
  stacked?: boolean;
  yAxisMin?: number | null;
  yAxisMax?: number | null;
  datasets: Dataset[];
}

export interface Dataset {
  label: string;
  index: number;
  filled?: boolean;
  smoothing?: boolean;
  smoothingWindow?: number;
  dataPoints: DataPoint[];
  color?: string;
}

export interface DataPoint {
  x: string;
  y: string;
}
