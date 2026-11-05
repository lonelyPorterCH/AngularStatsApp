package ch.lonelyporter.statsapp.domain.scores;

import java.time.LocalDateTime;

public record ScoreEvent(
        long leaderboardId,
        LocalDateTime timeSet,
        long timeSetMillis,
        double accuracy,
        String songHash
) {
}
