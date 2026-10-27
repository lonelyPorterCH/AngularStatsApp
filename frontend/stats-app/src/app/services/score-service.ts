import {Injectable} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {environment} from '../../environments/environment';
import {Player, Score} from '../models/score';

@Injectable({providedIn: 'root'})
export class ScoreService {
  private readonly baseUrl = environment.scoresApiBaseUrl;

  constructor(private readonly http: HttpClient) {
  }

  getPlayers(): Observable<Player[]> {
    return this.http.get<Player[]>(`${this.baseUrl}/players/details`);
  }

  addPlayer(playerId: string): Observable<Player> {
    return this.http.post<Player>(`${this.baseUrl}/players/${encodeURIComponent(playerId)}`, {});
  }

  getScores(playerId: string): Observable<Score[]> {
    return this.http.get<Score[]>(`${this.baseUrl}/players/${encodeURIComponent(playerId)}/scores`);
  }

  compareScores(playerId: string, otherPlayerId: string): Observable<Record<string, Score[]>> {
    return this.http.get<Record<string, Score[]>>(
      `${this.baseUrl}/players/${encodeURIComponent(playerId)}/scores/compare/${encodeURIComponent(otherPlayerId)}`
    );
  }

  updateScores(playerId: string): Observable<number> {
    return this.http.post<number>(`${this.baseUrl}/players/${encodeURIComponent(playerId)}/scores/update`, {});
  }
}
