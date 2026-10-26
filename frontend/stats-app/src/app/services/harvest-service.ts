import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {HarvestView} from '../models/harvest';

@Injectable({providedIn: 'root'})
export class HarvestService {
  private readonly baseUrl = environment.harvestApiBaseUrl;

  constructor(private readonly http: HttpClient) {
  }

  getYears(): Observable<number[]> {
    return this.http.get<number[]>(`${this.baseUrl}/years`);
  }

  getSeason(year: number): Observable<HarvestView> {
    return this.http.get<HarvestView>(`${this.baseUrl}/${year}`);
  }

  addPlant(year: number, name: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${year}/plants`, {name});
  }

  renamePlant(year: number, plantId: string, name: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${year}/plants/${encodeURIComponent(plantId)}`, {name});
  }

  deletePlant(year: number, plantId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${year}/plants/${encodeURIComponent(plantId)}`);
  }

  addHarvest(year: number, plantId: string, date: string, quantity: number): Observable<void> {
    return this.http.post<void>(this.harvestUrl(year, plantId), {date, quantity});
  }

  updateHarvest(year: number, plantId: string, harvestId: string, date: string, quantity: number): Observable<void> {
    return this.http.patch<void>(`${this.harvestUrl(year, plantId)}/${encodeURIComponent(harvestId)}`, {date, quantity});
  }

  deleteHarvest(year: number, plantId: string, harvestId: string): Observable<void> {
    return this.http.delete<void>(`${this.harvestUrl(year, plantId)}/${encodeURIComponent(harvestId)}`);
  }

  private harvestUrl(year: number, plantId: string): string {
    return `${this.baseUrl}/${year}/plants/${encodeURIComponent(plantId)}/harvests`;
  }
}
