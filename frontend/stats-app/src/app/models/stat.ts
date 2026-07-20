export interface Stat {
  id: string;
  title: string;
  xAxisName: string;
  yAxisName: string;
  xAxisScaleType?: 'time' | 'linear';
  reverse: boolean;
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
