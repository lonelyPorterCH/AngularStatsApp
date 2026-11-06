package ch.lonelyporter.statsapp.integration.scoresaber;

import ch.lonelyporter.statsapp.domain.scores.LeaderboardMetadata;
import ch.lonelyporter.statsapp.domain.scores.ScoreRecord;

import java.util.List;

public record PlayerScoreHistoryUpdate(List<ScoreRecord> newScores, List<LeaderboardMetadata> leaderboards) {
}
