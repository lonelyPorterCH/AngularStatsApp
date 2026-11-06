package ch.lonelyporter.statsapp.domain.scores;

public record LeaderboardMetadata(
        long leaderboardId,
        String songHash,
        String songName,
        String levelAuthorName,
        double stars,
        SongDifficulty difficulty
) {
}
