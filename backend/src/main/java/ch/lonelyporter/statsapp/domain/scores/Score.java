package ch.lonelyporter.statsapp.domain.scores;

import java.time.LocalDateTime;

public record Score(
        String songName,
        String levelAuthorName,
        long timeSetMillis,
        double accuracy,
        long leaderboardId,
        double stars,
        LocalDateTime timeSet,
        String songHash,
        SongDifficulty difficulty
) {
}
