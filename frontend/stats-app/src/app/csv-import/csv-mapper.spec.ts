import {buildGraphs, dateValue, numericValue, parseCsv, previewCsv, validGraphId} from './csv-mapper';

const SAMPLE = 'Date,"Weight (kg)","Fat mass (kg)","Bone mass (kg)","Muscle mass (kg)","Hydration (kg)",Comments\r\n"2026-10-30 12:11:09",64.00,8.80,2.77,52.41,37.70,';

describe('CSV import mapping', () => {
  it('imports only weight and discards the time without a timezone shift', () => {
    const preview = previewCsv(parseCsv(SAMPLE), 0, [1]);
    expect(preview.datasets[0].dataPoints).toEqual([{x: '2026-10-30', y: '64'}]);
    expect(preview.issues).toEqual([]);
    expect(preview.datasets).toHaveLength(1);
  });

  it('creates either one combined graph or separate graphs', () => {
    const preview = previewCsv(parseCsv(SAMPLE), 0, [1, 2]);
    const combined = buildGraphs(preview.datasets, false, 'Body measurements');
    expect(combined).toHaveLength(1);
    expect(combined[0].datasets.map(dataset => dataset.index)).toEqual([0, 1]);
    expect(combined[0].yAxisName).toBe('kg');
    const separate = buildGraphs(preview.datasets, true, 'Body measurements');
    expect(separate).toHaveLength(2);
    expect(separate[1].datasets[0].index).toBe(0);
    expect(separate[1].datasets[0].dataPoints[0].y).toBe('8.8');
  });

  it('handles BOM, escaped quotes, multiline comments and duplicate headers', () => {
    const table = parseCsv('\uFEFFDate,Weight,Weight,,Comments\r\n2026-10-30,0,-1,,"hello, ""there""\nsecond line"\r\n');
    expect(table.headers).toEqual(['Date', 'Weight', 'Weight (2)', 'Column 4', 'Comments']);
    expect(table.rows).toHaveLength(1);
    expect(table.rows[0][4]).toContain('hello, "there"');
    expect(previewCsv(table, 0, [1, 2]).datasets.map(dataset => dataset.dataPoints[0].y)).toEqual(['0', '-1']);
  });

  it('skips bad dates per row and bad cells per dataset while preserving duplicate dates', () => {
    const table = parseCsv('Date,A,B\n2026-10-30,1,\n2026-10-30,NaN,2\n2026-02-30,3,4');
    const preview = previewCsv(table, 0, [1, 2]);
    expect(preview.datasets.map(dataset => dataset.dataPoints.length)).toEqual([1, 1]);
    expect(preview.issues).toHaveLength(3);
    expect(preview.duplicateDates).toBe(1);
  });

  it('rejects partial, grouped and nonfinite numbers without dropping zero', () => {
    for (const value of ['', ' ', '1kg', '1,234', 'NaN', 'Infinity', '1e999']) {
      expect(numericValue(value)).toBeNull();
    }
    expect(numericValue('0')).toBe('0');
    expect(numericValue('-1.25e2')).toBe('-125');
  });

  it('rejects ambiguous dates, invalid times, missing headers and malformed CSV', () => {
    expect(dateValue('10/30/2026')).toBeNull();
    expect(dateValue('2026-10-30 25:00:00')).toBeNull();
    expect(dateValue('2026-10-30 24:00:00')).toBeNull();
    expect(() => parseCsv('Date,Value')).toThrow();
    expect(() => parseCsv('Date,Value\n2026-10-30,"unfinished')).toThrow();
    expect(() => parseCsv('Date,Value\n2026-10-30,1,extra')).toThrow();
  });

  it('imports Swiss dates and timestamps from semicolon-delimited CSVs', () => {
    const table = parseCsv('Datum;Weight;Comments\r\n30.10.2026;64;"hello; there"\r\n3.4.2026 9:05:07;65;');
    const preview = previewCsv(table, 0, [1]);
    expect(preview.datasets[0].dataPoints).toEqual([
      {x: '2026-10-30', y: '64'}, {x: '2026-04-03', y: '65'}
    ]);
    expect(preview.issues).toEqual([]);
  });

  it.each(['\t', '|'])('detects the %j delimiter', delimiter => {
    const table = parseCsv(`Date${delimiter}Weight\n30.10.2026${delimiter}64`);
    expect(previewCsv(table, 0, [1]).datasets[0].dataPoints).toEqual([{x: '2026-10-30', y: '64'}]);
  });

  it('accepts ISO offsets without converting the calendar date to UTC', () => {
    expect(dateValue('2026-10-30T00:15:00+02:00')).toBe('2026-10-30');
    expect(dateValue('2026-10-30T23:15:00-05:00')).toBe('2026-10-30');
    expect(dateValue('2026-10-30T12:11Z')).toBe('2026-10-30');
  });

  it('uses explicit Luxon formats rather than guessing ambiguous dates', () => {
    expect(dateValue('03/04/2026')).toBeNull();
    expect(dateValue('03/04/2026', 'dd/MM/yyyy')).toBe('2026-04-03');
    expect(dateValue('03/04/2026', 'MM/dd/yyyy')).toBe('2026-03-04');
    expect(dateValue('20260403', 'yyyyMMdd')).toBe('2026-04-03');
    expect(dateValue('3 Apr 2026', 'd MMM yyyy')).toBe('2026-04-03');
    expect(dateValue('03.04.2026 09:05:07', 'dd.MM.yyyy HH:mm:ss')).toBe('2026-04-03');
    const preview = previewCsv(parseCsv('Date,Value\n03/04/2026,1'), 0, [1], 'dd/MM/yyyy');
    expect(preview.datasets[0].dataPoints).toEqual([{x: '2026-04-03', y: '1'}]);
    expect(preview.issues).toEqual([]);
  });

  it('rejects impossible dates and times in automatic and custom formats', () => {
    for (const token of ['31.04.2026', '29.02.2025', '30.10.2026 24:00:00', '30.10.2026 12:60:00']) {
      expect(dateValue(token)).toBeNull();
    }
    expect(dateValue('29.02.2024')).toBe('2024-02-29');
    expect(dateValue('31/04/2026', 'dd/MM/yyyy')).toBeNull();
    expect(dateValue('30.10.2026 24:00:00', 'dd.MM.yyyy HH:mm:ss')).toBeNull();
  });

  it('reports invalid custom format specifications without breaking the preview', () => {
    const preview = previewCsv(parseCsv('Date,Value\n30.10.2026 13 PM,1'), 0, [1], 'dd.MM.yyyy HH a');
    expect(preview.datasets[0].dataPoints).toEqual([]);
    expect(preview.issues[0]).toContain('invalid date format');
  });

  it('filters custom-formatted CSV dates inclusively before counting duplicates or validating values', () => {
    const table = parseCsv('Date,Value\n12/31/2025,bad\n12/31/2025,2\n01/01/2026,3\n12/31/2026,4\n01/01/2027,bad');
    const preview = previewCsv(table, 0, [1], 'MM/dd/yyyy', {from: '01.01.2026', to: '31.12.2026'});
    expect(preview.datasets[0].dataPoints).toEqual([
      {x: '2026-01-01', y: '3'}, {x: '2026-12-31', y: '4'}
    ]);
    expect(preview.excludedRows).toBe(3);
    expect(preview.duplicateDates).toBe(0);
    expect(preview.issues).toEqual([]);
    expect(preview.rangeError).toBe('');
  });

  it.each([
    [{from: '01.01.2026'}, ['2026-01-01', '2027-01-01'], 1],
    [{to: '01.01.2026'}, ['2025-01-01', '2026-01-01'], 1],
    [{from: '01.01.2026', to: '01.01.2026'}, ['2026-01-01'], 2],
    [{from: ' ', to: ''}, ['2025-01-01', '2026-01-01', '2027-01-01'], 0]
  ] as const)('supports open-ended, single-day and unrestricted ranges: %j', (range, dates, excluded) => {
    const table = parseCsv('Date,Value\n2025-01-01,1\n2026-01-01,2\n2027-01-01,3');
    const preview = previewCsv(table, 0, [1], '', range);
    expect(preview.datasets[0].dataPoints.map(point => point.x)).toEqual(dates);
    expect(preview.excludedRows).toBe(excluded);
  });

  it.each([
    [{from: '31.02.2026'}, 'valid From date'],
    [{to: 'not a date'}, 'valid To date'],
    [{from: '31.12.2026', to: '01.01.2026'}, 'on or before']
  ])('reports invalid ranges instead of silently importing all data: %j', (range, message) => {
    const preview = previewCsv(parseCsv(SAMPLE), 0, [1], '', range);
    expect(preview.rangeError).toContain(message);
    expect(preview.datasets[0].dataPoints).toEqual([]);
  });

  it('rejects unsafe and reserved graph identifiers', () => {
    for (const id of ['', '../test', 'a/b', 'a\\b', 'archived', 'new', 'import', 'CON', 'com1']) {
      expect(validGraphId(id)).toBe(false);
    }
    expect(validGraphId('weight-123')).toBe(true);
  });
});