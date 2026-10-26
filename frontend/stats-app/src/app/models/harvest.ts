export interface HarvestEntry {
  id: string;
  date: string;
  quantity: number;
}

export interface HarvestPlant {
  id: string;
  name: string;
  harvests: HarvestEntry[];
}

export interface HarvestChartPoint {
  date: string;
  quantity: number;
}

export interface HarvestPlantTotal {
  plantId: string;
  plantName: string;
  totalQuantity: number;
}

export interface HarvestSeries {
  plantId: string;
  plantName: string;
  points: HarvestChartPoint[];
}

export interface HarvestView {
  year: number;
  plants: HarvestPlant[];
  plantTotals: HarvestPlantTotal[];
  plantSeries: HarvestSeries[];
  globalSeries: HarvestChartPoint[];
  totalQuantity: number;
}
