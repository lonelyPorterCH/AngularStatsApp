import {formatPace, parseYAxisValue} from './y-axis';
import {Stat} from './stat';

describe('Pace values', () => {
  const stat: Stat = {id: 'pace', title: 'Pace', xAxisName: 'Date', yAxisName: 'Pace',
    reverse: true, yAxisFormat: 'pace', datasets: []};

  it('interprets legacy decimal-looking pace and explicit m:ss as seconds', () => {
    for (const [value, seconds] of [['4.59', 299], ['5.11', 311], ['05.09', 309],
      ['5.1', 310], ['5:1', 301], ['5:09', 309], ['5', 300], ['0.00', 0]] as const) {
      expect(parseYAxisValue(value, stat)).toBe(seconds);
    }
    expect(parseYAxisValue('5.11', {...stat, yAxisFormat: 'number'})).toBe(5.11);
    expect(parseYAxisValue('5.11', {...stat, yAxisFormat: undefined})).toBe(5.11);
  });

  it('rejects invalid pace rather than treating it as decimal minutes', () => {
    for (const value of ['5.60', '5:60', '-1', '5.123', 'abc', 'NaN', 'Infinity', '']) {
      expect(parseYAxisValue(value, stat)).toBeNaN();
    }
  });

  it('rounds seconds and carries correctly into the next minute', () => {
    expect(formatPace((299 + 311) / 2)).toBe('5:05');
    expect(formatPace(299.8)).toBe('5:00');
    expect(formatPace(0)).toBe('0:00');
  });
});
