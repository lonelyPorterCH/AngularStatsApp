export interface ChartPlacement {
  statisticId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DashboardGroup {
  id: string;
  title: string;
  charts: ChartPlacement[];
}

export interface DashboardLayout {
  groups: DashboardGroup[];
}

export const GRID_COLUMNS = 12;
export const MIN_CHART_WIDTH = 2;
export const MIN_CHART_HEIGHT = 3;

function overlaps(a: ChartPlacement, b: ChartPlacement): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width
    && a.y < b.y + b.height && b.y < a.y + a.height;
}

export function placeChart(group: DashboardGroup, chart: ChartPlacement): void {
  const placed = [chart];
  const others = group.charts.filter(item => item.statisticId !== chart.statisticId)
    .sort((a, b) => a.y - b.y || a.x - b.x);
  for (const other of others) {
    let collisions = placed.filter(item => overlaps(item, other));
    while (collisions.length) {
      other.y = Math.max(...collisions.map(item => item.y + item.height));
      collisions = placed.filter(item => overlaps(item, other));
    }
    placed.push(other);
  }
  group.charts = placed;
}

export function appendChart(group: DashboardGroup, statisticId: string): void {
  const width = 6;
  const height = 4;
  let y = 0;
  while (true) {
    for (let x = 0; x <= GRID_COLUMNS - width; x += width) {
      const chart = {statisticId, x, y, width, height};
      if (!group.charts.some(item => overlaps(item, chart))) {
        group.charts.push(chart);
        return;
      }
    }
    y = Math.min(...group.charts.filter(item => item.y + item.height > y).map(item => item.y + item.height));
  }
}
