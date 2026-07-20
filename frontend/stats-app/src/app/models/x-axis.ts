import {DataPoint, Stat} from './stat';

export function isLinearXAxis(stat: Stat): boolean {
  return stat.xAxisScaleType === 'linear';
}

export function compareDataPoints(a: DataPoint, b: DataPoint, stat: Stat): number {
  if (isLinearXAxis(stat)) {
    return Number(a.x) - Number(b.x);
  }
  return new Date(a.x).getTime() - new Date(b.x).getTime();
}

export function parseXAxisValue(value: string, stat: Stat): string | number {
  return isLinearXAxis(stat) ? Number(value) : value;
}