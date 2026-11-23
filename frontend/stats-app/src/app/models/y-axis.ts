import {Dataset, Stat} from './stat';

export function isPercentageInput(stat: Stat): boolean {
  return stat.yAxisFormat === 'percentage' && stat.percentageInputMode === 'percentage';
}

export function countToPercentage(count: number, dataset: Dataset): number {
  return count / (dataset.percentageTarget ?? 100) * 100;
}

export function percentageToCount(percentage: number, dataset: Dataset): number {
  return percentage / 100 * (dataset.percentageTarget ?? 100);
}

export function formatInputNumber(value: number): string {
  return String(Number(value.toFixed(2)));
}

export class PercentageInputValue {
  private original?: {count: string; display: string; label: string; target: number; percentage: boolean};

  reset(): void {
    this.original = undefined;
  }

  displayCount(count: string, dataset: Dataset, percentage: boolean): string {
    this.reset();
    if (!count.trim() || !Number.isFinite(Number(count))) return count;
    const value = percentage ? countToPercentage(Number(count), dataset) : Number(count);
    const display = `${count.startsWith('+') ? '+' : ''}${formatInputNumber(value)}`;
    // Keep the exact count separate from its rounded representation.
    this.original = {count, display, label: dataset.label, target: dataset.percentageTarget ?? 100, percentage};
    return display;
  }

  toCount(value: string, dataset: Dataset, percentage: boolean): string {
    const original = this.original;
    if (original && original.label === dataset.label && original.target === (dataset.percentageTarget ?? 100)
      && original.percentage === percentage && Number(original.display) === Number(value)
      && original.display.startsWith('+') === value.startsWith('+')) {
      return original.count;
    }
    if (!percentage || !value.trim()) return value;
    return `${value.startsWith('+') ? '+' : ''}${percentageToCount(Number(value), dataset)}`;
  }

  switchMode(value: string, dataset: Dataset, toPercentage: boolean): string {
    return this.displayCount(this.toCount(value, dataset, !toPercentage), dataset, toPercentage);
  }
}

export function parseYAxisValue(value: string, stat: Stat): number {
  if (stat.yAxisFormat !== 'pace') return Number.parseFloat(value);
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
