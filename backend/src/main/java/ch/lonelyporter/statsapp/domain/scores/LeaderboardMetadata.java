package ch.lonelyporter.statsapp.domain.scores;

public record LeaderboardMetadata(
        long leaderboardId,
        String songHash,
        String songName,
        String levelAuthorName,
        String difficulty,
        String gameMode,
        double stars
) {
}
