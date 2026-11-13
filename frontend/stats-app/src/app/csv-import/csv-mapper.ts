import Papa from 'papaparse';
import {DateTime} from 'luxon';
import {Dataset, Stat} from '../models/stat';

export interface CsvTable {
  headers: string[];
  rows: string[][];
}

export interface ImportPreview {
  datasets: Dataset[];
  issues: string[];
  duplicateDates: number;
  excludedRows: number;
  rangeError: string;
}

export interface CsvDateRange {
  from?: string;
  to?: string;
}

export function parseCsv(text: string): CsvTable {
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), {
    delimiter: '', delimitersToGuess: [',', ';', '\t', '|'], skipEmptyLines: 'greedy'
  });
  if (parsed.errors.length) {
    throw new Error(`Invalid CSV: ${parsed.errors[0].message}`);
  }
  const [header, ...rows] = parsed.data;
  if (!header || header.length < 2 || !rows.length) {
    throw new Error('The CSV must contain a header, a date column and at least one measurement row.');
  }
  if (rows.some(row => row.length > header.length)) {
    throw new Error('A row has more cells than the header. Check the CSV delimiter and quoting.');
  }
  const used = new Set<string>();
  const headers = header.map((cell, index) => {
    const base = cell.trim() || `Column ${index + 1}`;
    let label = base;
    let suffix = 2;
    while (used.has(label)) label = `${base} (${suffix++})`;
    used.add(label);
    return label;
  });
  return {headers, rows};
}

export function numericValue(value: string | undefined): string | null {
  const token = value?.trim() ?? '';
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(token)) return null;
  const numeric = Number(token);
  return Number.isFinite(numeric) ? String(numeric) : null;
}

export function dateValue(value: string | undefined, format = ''): string | null {
  const token = value?.trim() ?? '';
  const options = {zone: 'UTC', setZone: true, locale: 'en'};
  if (format.trim()) {
    if ((DateTime.fromFormatExplain(token, format.trim(), options).result?.['hour'] ?? 0) > 23) return null;
    const date = DateTime.fromFormat(token, format.trim(), options);
    return date.isValid ? date.toISODate() : null;
  }
  const swiss = /^(\d{1,2})\.(\d{1,2})\.(\d{4})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2})(?:\.(\d{1,3}))?)?)?$/.exec(token);
  if (swiss) {
    const [, day, month, year, hour = '0', minute = '0', second = '0', millisecond = '0'] = swiss;
    if (Number(hour) > 23) return null;
    const date = DateTime.fromObject({
      year: Number(year), month: Number(month), day: Number(day),
      hour: Number(hour), minute: Number(minute), second: Number(second),
      millisecond: Number(millisecond.padEnd(3, '0'))
    }, options);
    return date.isValid ? date.toISODate() : null;
  }
  // Reject ISO's next-day 24:00 notation rather than silently changing the measurement date.
  if (!/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/.test(token)
    || Number(token.slice(11, 13)) > 23) return null;
  const date = DateTime.fromISO(token.replace(' ', 'T'), options);
  return date.isValid ? date.toISODate() : null;
}

export function previewCsv(table: CsvTable, dateColumn: number, columns: number[], dateFormat = '',
                           range: CsvDateRange = {}): ImportPreview {
  const datasets: Dataset[] = columns.map((column, index) => ({
    label: table.headers[column], index, dataPoints: []
  }));
  const fromText = range.from?.trim() ?? '';
  const toText = range.to?.trim() ?? '';
  const from = fromText ? dateValue(fromText, 'd.M.yyyy') : null;
  const to = toText ? dateValue(toText, 'd.M.yyyy') : null;
  const rangeError = fromText && !from ? 'Enter a valid From date in dd.MM.yyyy format.'
    : toText && !to ? 'Enter a valid To date in dd.MM.yyyy format.'
    : from && to && from > to ? 'From date must be on or before To date.' : '';
  if (rangeError) {
    return {datasets, issues: [], duplicateDates: 0, excludedRows: 0, rangeError};
  }
  const issues: string[] = [];
  const dates = new Set<string>();
  let duplicateDates = 0;
  let excludedRows = 0;
  table.rows.forEach((row, rowIndex) => {
    let date: string | null;
    try {
      date = dateValue(row[dateColumn], dateFormat);
    } catch (error) {
      issues.push(`Record ${rowIndex + 2}: invalid date format: ${error instanceof Error ? error.message : String(error)}; row skipped.`);
      return;
    }
    if (!date) {
      issues.push(`Record ${rowIndex + 2}: missing or invalid date; check the Date Format field; row skipped.`);
      return;
    }
    if ((from && date < from) || (to && date > to)) {
      excludedRows++;
      return;
    }
    if (dates.has(date)) duplicateDates++;
    dates.add(date);
    columns.forEach((column, datasetIndex) => {
      const value = numericValue(row[column]);
      if (value === null) {
        issues.push(`Record ${rowIndex + 2}, ${table.headers[column]}: missing or invalid number; value skipped.`);
      } else {
        datasets[datasetIndex].dataPoints.push({x: date, y: value});
      }
    });
  });
  return {datasets, issues, duplicateDates, excludedRows, rangeError};
}

export function buildGraphs(datasets: Dataset[], separate: boolean, title: string): Stat[] {
  const groups = separate ? datasets.map(dataset => [dataset]) : [datasets];
  return groups.map(group => ({
    id: '', title: separate ? group[0].label : title,
    xAxisName: 'Date', yAxisName: separate ? group[0].label : sharedUnit(group) || 'Value',
    xAxisScaleType: 'time', reverse: false,
    datasets: group.map((dataset, index) => ({...dataset, index}))
  }));
}

export function sharedUnit(datasets: Dataset[]): string | null {
  const units = datasets.map(dataset => /\(([^()]*)\)$/.exec(dataset.label)?.[1]?.trim());
  return units.length && units[0] && units.every(unit => unit === units[0]) ? units[0] : null;
}

export function validGraphId(id: string): boolean {
  return /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(id)
    && !['archived', 'new', 'import', 'con', 'prn', 'aux', 'nul'].includes(id.toLowerCase())
    && !/^(?:com|lpt)[1-9]$/i.test(id);
}