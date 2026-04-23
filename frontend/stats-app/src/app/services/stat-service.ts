import {Injectable} from '@angular/core';
import {Stat} from '../models/stat.model';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';

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

}
