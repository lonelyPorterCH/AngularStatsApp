import {formatPace, parseYAxisValue, PercentageInputValue} from './y-axis';
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

  describe('Percentage input precision', () => {
    const dataset = {label: 'Rocket leaders', index: 0, percentageTarget: 30, dataPoints: []};

    it('rounds display values to two decimals without round-tripping the rounded text', () => {
      for (const count of ['10', '+10', '10.123456']) {
        const input = new PercentageInputValue();
        const percentage = input.switchMode(count, dataset, true);
        expect(percentage).toBe(count === '10.123456' ? '33.74' : count === '+10' ? '+33.33' : '33.33');
        expect(input.toCount(percentage, dataset, true)).toBe(count);
        const number = input.switchMode(percentage, dataset, false);
        expect(number).toBe(count === '10.123456' ? '10.12' : count);
        expect(input.toCount(number, dataset, false)).toBe(count);
        expect(input.switchMode(number, dataset, true)).toBe(percentage);
      }
    });

    it('does not reuse preserved counts after the input is edited, reset or used for another dataset', () => {
      const input = new PercentageInputValue();
      input.displayCount('10', dataset, true);
      expect(input.toCount('50', dataset, true)).toBe('15');
      input.reset();
      expect(Number(input.toCount('33.33', dataset, true))).toBeCloseTo(9.999, 10);
      input.displayCount('10', dataset, true);
      expect(input.toCount('33.33', {...dataset, label: 'Other', percentageTarget: 100}, true)).toBe('33.33');
      expect(input.switchMode('', dataset, true)).toBe('');
      expect(input.switchMode('invalid', dataset, true)).toBe('invalid');
    });
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
