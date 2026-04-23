import {Injectable} from '@angular/core';
import {Stat} from '../models/stat.model';

@Injectable({
  providedIn: 'root',
})
export class StatService {
  //TODO: temporary, will be replaced with backend call later
  private stats: Stat[] = [
    {
      id: "arc-raiders-trials",
      title: "ARC Raiders - Trials",
      reverse: false,
      xAxisName: "Week",
      yAxisName: "Score",
      dataPoints: [{x: "2026-02-16", y: "21351"}, {x: "2026-02-23", y: "25801"}]
    },
    {
      id: "pogo-coins-2026",
      title: "Pokécoins PoGO - 2026",
      reverse: false,
      xAxisName: "Date",
      yAxisName: "Coins",
      dataPoints: [{x: "2026-01-01", y: "4565"}, {x: "2026-01-02", y: "4615"}]
    }
  ];

  getStats(): Stat[] {
    return this.stats;
  }

}
