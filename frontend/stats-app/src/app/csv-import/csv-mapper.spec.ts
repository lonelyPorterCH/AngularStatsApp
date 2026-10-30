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

  it('rejects unsafe and reserved graph identifiers', () => {
    for (const id of ['', '../test', 'a/b', 'a\\b', 'archived', 'new', 'import', 'CON', 'com1']) {
      expect(validGraphId(id)).toBe(false);
    }
    expect(validGraphId('weight-123')).toBe(true);
  });
});