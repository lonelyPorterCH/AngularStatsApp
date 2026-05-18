import {Injectable} from '@angular/core';
import {DataPoint, Stat} from '../models/stat';
import {HttpClient} from '@angular/common/http';
import {catchError, map, Observable, of} from 'rxjs';
import {environment} from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class StatService {

  private baseUrl = environment.apiBaseUrl;

  constructor(private http: HttpClient) {
  }

  getStats(): Observable<Stat[]> {
    return this.http.get<Stat[]>(this.baseUrl);
  }

  getStatById(id: string): Observable<Stat> {
    return this.http.get<Stat>(`${this.baseUrl}/${id}`);
  }

  existsById(id: string): Observable<boolean> {
    return this.http.get<Stat>(`${this.baseUrl}/${id}`).pipe(
      map(() => true),
      catchError(() => of(false))
    );
  }

  addStat(stat: Stat) {
    return this.http.post<Stat>(`${this.baseUrl}`, stat);
  }

  deleteStat(id: string) {
    return this.http.delete<Stat>(`${this.baseUrl}/${id}`);
  }

  addDataset(id: string, label: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/dataset`, {label});
  }

  deleteDataset(id: string, label: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/dataset/${encodeURIComponent(label)}`);
  }

  renameDataset(id: string, oldLabel: string, newLabel: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/dataset/${encodeURIComponent(oldLabel)}`, {label: newLabel});
  }

  renameAxes(id: string, xAxisName: string, yAxisName: string): Observable<void> {
    return this.http.patch<void>(`${this.baseUrl}/${id}/axes`, {xAxisName, yAxisName});
  }

  reorderDatasets(id: string, orderedLabels: string[]): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${id}/datasets/reorder`, orderedLabels);
  }

  addDataPoint(id: string, datasetLabel: string, dataPoint: DataPoint): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/datapoint`, {
      datasetLabel,
      x: dataPoint.x,
      y: dataPoint.y
    });
  }

  deleteDataPoint(id: string, datasetLabel: string, dataPoint: DataPoint): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/datapoint`, {
      body: {datasetLabel, x: dataPoint.x, y: dataPoint.y}
    });
  }
}
