package ch.lonelyporter.statsapp.domain.scores;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ScoreRepository {
    List<Score> loadScores(String playerId);

    void addScores(List<ScoreRecord> scores, String playerId);

    void refreshLeaderboardMetadata(List<LeaderboardMetadata> leaderboards);

    List<LeaderboardMetadata> getAllLeaderboardMetadata();

    Optional<LocalDateTime> mostRecentScoreDate(String playerId);

    List<String> getAllPlayerIds();
}
