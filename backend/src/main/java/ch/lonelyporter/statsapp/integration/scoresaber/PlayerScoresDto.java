package ch.lonelyporter.statsapp.integration.scoresaber;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.time.Instant;
import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PlayerScoresDto(List<PlayerScore> data, Metadata metadata) {
    public record PlayerScore(Score score, Leaderboard leaderboard) {
    }

    public record Score(long id, Double accuracy, long modifiedScore, Instant createdAt) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Leaderboard(long id, Map map, int maxScore, Realm realm, Difficulty difficulty) {
    }

    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Difficulty(int difficulty, String gameMode) {
    }

    public record Map(String hash, String songName, String levelAuthorName) {
    }

    public record Realm(String leaderboardStatus, double stars) {
    }

    public record Metadata(int page, int itemsPerPage, int totalItems, int totalPages) {
    }
}
