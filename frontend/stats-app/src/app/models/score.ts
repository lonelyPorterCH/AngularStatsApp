export interface Player {
  id: string;
  name: string;
  country: string;
  rank: number | null;
}

export interface Score {
  songName: string;
  levelAuthorName: string;
  timeSetMillis: number;
  accuracy: number;
  id: number;
  stars: number;
  timeSet: string;
  songHash: string;
}

export interface PlayerScoreUpdate {
  playerId: string;
  playerName: string;
  scoresAdded: number;
}

export interface ScoreUpdateSummary {
  players: PlayerScoreUpdate[];
  leaderboardStarsRefreshed: boolean;
  leaderboardsChanged: number;
  leaderboardsChecked: number;
}
