import {Injectable} from '@angular/core';
import {DataPoint, Stat} from '../models/stat';
import {HttpClient} from '@angular/common/http';
import {catchError, map, Observable, of} from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class StatService {

  private baseUrl = 'http://localhost:8081/api/stats';

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

  addDataPoint(id: string, dataPoint: DataPoint): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/${id}/datapoint`, dataPoint);
  }

  deleteDataPoint(id: string, dataPoint: DataPoint): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/${id}/datapoint`, {body: dataPoint});
  }
}
