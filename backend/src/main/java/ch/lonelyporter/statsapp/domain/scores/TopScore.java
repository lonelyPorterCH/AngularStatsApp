package ch.lonelyporter.statsapp.domain.scores;

import java.time.LocalDateTime;

public record TopScore(long leaderboardId, String songHash, LocalDateTime timeSet, double accuracy) {
}
