import {Injectable} from '@angular/core';
import {Stat} from '../models/stat';
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

}
