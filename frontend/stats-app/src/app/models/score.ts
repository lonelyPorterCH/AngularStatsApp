export interface Player {
  id: string;
  name: string;
  country: string;
  rank: number | null;
}

export interface SongDifficulty {
  characteristic: string;
  name: 'Easy' | 'Normal' | 'Hard' | 'Expert' | 'ExpertPlus';
}

export interface Score {
  songName: string;
  levelAuthorName: string;
  timeSetMillis: number;
  accuracy: number;
  leaderboardId: number;
  stars: number;
  timeSet: string;
  songHash: string;
  difficulty?: SongDifficulty | null;
  noFail?: boolean | null;
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
