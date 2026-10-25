package ch.lonelyporter.statsapp.scores.domain;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface ScoreRepository {
    List<Score> loadScores(String playerId);

    void addScores(List<Score> scores, String playerId);

    Optional<LocalDateTime> mostRecentScoreDate(String playerId);

    List<String> getAllPlayerIds();
}
