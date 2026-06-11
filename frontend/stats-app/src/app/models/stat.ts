export interface Stat {
  id: string;
  title: string;
  xAxisName: string;
  yAxisName: string;
  reverse: boolean;
  datasets: Dataset[];
}

export interface Dataset {
  label: string;
  index: number;
  filled?: boolean;
  dataPoints: DataPoint[];
}

export interface DataPoint {
  x: string;
  y: string;
}
