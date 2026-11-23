import {appendChart, DashboardGroup, placeChart} from './dashboard-layout';

describe('dashboard placements', () => {
  it('pushes overlapping charts down without moving the chosen chart', () => {
    const group: DashboardGroup = {id: 'g', title: 'Group', charts: [
      {statisticId: 'tall', x: 0, y: 0, width: 6, height: 8},
      {statisticId: 'top', x: 6, y: 0, width: 6, height: 4},
      {statisticId: 'bottom', x: 6, y: 4, width: 6, height: 4}
    ]};
    placeChart(group, {statisticId: 'tall', x: 6, y: 0, width: 6, height: 8});
    expect(group.charts.find(chart => chart.statisticId === 'tall')?.y).toBe(0);
    expect(group.charts.find(chart => chart.statisticId === 'top')?.y).toBe(8);
    expect(group.charts.find(chart => chart.statisticId === 'bottom')?.y).toBe(12);
  });

  it('appends new charts into the first available default-sized space', () => {
    const group: DashboardGroup = {id: 'g', title: 'Group', charts: []};
    appendChart(group, 'first');
    appendChart(group, 'second');
    appendChart(group, 'third');
    expect(group.charts.map(({x, y}) => [x, y])).toEqual([[0, 0], [6, 0], [0, 4]]);
  });
});
