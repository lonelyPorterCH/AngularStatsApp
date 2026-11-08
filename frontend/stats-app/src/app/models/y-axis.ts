import {Stat} from './stat';

export function parseYAxisValue(value: string, stat: Stat): number {
  if (stat.yAxisFormat !== 'pace') return parseFloat(value);
  const match = /^(\d+)(?:([.:])(\d{1,2}))?$/.exec(value.trim());
  if (!match) return NaN;
  const seconds = Number(match[3] ? (match[2] === '.' ? match[3].padEnd(2, '0') : match[3]) : 0);
  const total = Number(match[1]) * 60 + seconds;
  return seconds < 60 && Number.isFinite(total) ? total : NaN;
}

export function formatPace(seconds: number): string {
  const rounded = Math.round(seconds);
  return `${Math.floor(rounded / 60)}:${String(rounded % 60).padStart(2, '0')}`;
}
