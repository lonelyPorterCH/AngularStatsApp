package ch.lonelyporter.statsapp.scores;

import java.time.LocalDateTime;

public record Score(
        String songName,
        String levelAuthorName,
        long timeSetMillis,
        double accuracy,
        long id,
        double stars,
        LocalDateTime timeSet,
        String songHash
) {
}
