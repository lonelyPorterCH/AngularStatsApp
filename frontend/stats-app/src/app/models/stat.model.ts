export interface Stat {
  id: string;
  title: string;
  xAxisName: string;
  yAxisName: string;
  reverse: boolean;
  dataPoints: DataPoint[];
}

export interface DataPoint {
  x: string;
  y: string;
}
