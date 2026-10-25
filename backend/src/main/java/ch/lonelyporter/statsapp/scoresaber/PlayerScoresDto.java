package ch.lonelyporter.statsapp.scoresaber;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PlayerScoresDto(List<PlayerScore> data, Metadata metadata) {
    public record PlayerScore(Score score, Leaderboard leaderboard) {
    }

    public record Score(long id, Double accuracy, long modifiedScore, Instant createdAt) {
    }

    public record Leaderboard(long id, Map map, Difficulty difficulty, int maxScore, Realm realm) {
    }

    public record Map(String hash, String songName, String levelAuthorName) {
    }

    public record Difficulty(String rawDifficulty, String gameMode) {
    }

    public record Realm(String leaderboardStatus, double stars) {
    }

    public record Metadata(int page, int itemsPerPage, int totalItems, int totalPages) {
    }
}
