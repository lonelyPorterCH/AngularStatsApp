export interface Stat {
  id: string;
  title: string;
  xAxisName: string;
  yAxisName: string;
  xAxisScaleType?: 'time' | 'linear';
  xAxisUnit?: string;
  reverse: boolean;
  smoothing?: boolean;
  datasets: Dataset[];
}

export interface Dataset {
  label: string;
  index: number;
  filled?: boolean;
  dataPoints: DataPoint[];
  color?: string;
}

export interface DataPoint {
  x: string;
  y: string;
}
