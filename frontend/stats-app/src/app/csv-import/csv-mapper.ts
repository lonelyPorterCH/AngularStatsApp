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
}

export function parseCsv(text: string): CsvTable {
  const parsed = Papa.parse<string[]>(text.replace(/^\uFEFF/, ''), {
    delimiter: ',', skipEmptyLines: 'greedy'
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

export function dateValue(value: string | undefined): string | null {
  const token = value?.trim() ?? '';
  if (!/^\d{4}-\d{2}-\d{2}(?:[ T]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)?$/.test(token)) return null;
  if (token.length > 10 && (Number(token.slice(11, 13)) > 23
    || Number(token.slice(14, 16)) > 59 || Number(token.slice(17, 19)) > 59)) return null;
  const date = DateTime.fromISO(token.replace(' ', 'T'), {zone: 'UTC'});
  return date.isValid ? date.toISODate() : null;
}

export function previewCsv(table: CsvTable, dateColumn: number, columns: number[]): ImportPreview {
  const datasets: Dataset[] = columns.map((column, index) => ({
    label: table.headers[column], index, dataPoints: []
  }));
  const issues: string[] = [];
  const dates = new Set<string>();
  let duplicateDates = 0;
  table.rows.forEach((row, rowIndex) => {
    const date = dateValue(row[dateColumn]);
    if (!date) {
      issues.push(`Record ${rowIndex + 2}: missing or invalid date; row skipped.`);
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
  return {datasets, issues, duplicateDates};
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