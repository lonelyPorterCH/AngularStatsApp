package ch.lonelyporter.statsapp.persistence;

import ch.lonelyporter.statsapp.domain.scores.LeaderboardMetadata;
import ch.lonelyporter.statsapp.domain.scores.Score;
import ch.lonelyporter.statsapp.domain.scores.ScoreEvent;
import ch.lonelyporter.statsapp.domain.scores.ScoreRecord;
import ch.lonelyporter.statsapp.integration.scoresaber.ScoresProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class ScoreFileRepositoryFormatTest {
    private static final String HASH = "00DB999DD09E123C963B909B731E5D8AA0FA8B82";
    private static final LocalDateTime FIRST_DATE = LocalDateTime.of(2022, 1, 19, 19, 9, 8);
    @TempDir
    Path tempDir;

    @Test
    void newFormatComposesScoreEventsWithCompositeLeaderboardMetadataAndPreservesApiShape() throws Exception {
        ScoreFileRepository repository = createRepository();
        repository.addScores(List.of(
                scoreRecord(407243, FIRST_DATE, 54.0, "Hard", 6.14),
                scoreRecord(407243, FIRST_DATE.plusDays(2), 61.0, "Hard", 5.0),
                scoreRecord(407355, FIRST_DATE.plusDays(3), 70.0, "Normal", 4.65)
        ), "player-1");

        String eventFile = Files.readString(tempDir.resolve("player-1.json"));
        String leaderboardFile = Files.readString(tempDir.resolve("leaderboards.json"));
        assertThat(eventFile).contains("\"leaderboardId\"").doesNotContain("\"songName\"", "\"stars\"");
        assertThat(leaderboardFile).contains("\"songName\"", "\"stars\"", "\"difficulty\"");

        ScoreFileRepository reloaded = createRepository();
        reloaded.readScores();
        List<Score> scores = reloaded.loadScores("player-1");

        assertThat(scores).hasSize(3);
        assertThat(scores).extracting(Score::id).containsExactly(407243L, 407243L, 407355L);
        assertThat(scores).extracting(Score::songHash).containsOnly(HASH);
        assertThat(scores).extracting(Score::accuracy).containsExactly(54.0, 61.0, 70.0);
        assertThat(scores).extracting(Score::songName).containsOnly("song");
        assertThat(scores).extracting(Score::stars).containsExactly(6.14, 6.14, 4.65);
        assertThat(reloaded.mostRecentScoreDate("player-1")).contains(FIRST_DATE.plusDays(3));
        assertThat(reloaded.getAllPlayerIds()).containsExactly("player-1");

        String response = new ObjectMapper().writeValueAsString(scores);
        assertThat(response).contains("\"id\":407243", "\"songName\":\"song\"", "\"accuracy\":54.0",
                "\"timeSet\":\"2022-01-19T19:09:08\"");
        assertThat(response).doesNotContain("leaderboardId", "gameMode", "difficulty");
    }

    @Test
    void refreshingMetadataChangesComposedCacheOnlyAndLeavesHistoricalEventsUnchanged() throws Exception {
        ScoreFileRepository repository = createRepository();
        ScoreRecord historical = scoreRecord(1475, FIRST_DATE, 88.25, "Expert", 7.2);
        repository.addScores(List.of(historical), "player-1");
        String originalEvents = Files.readString(tempDir.resolve("player-1.json"));
        Score before = repository.loadScores("player-1").getFirst();

        repository.refreshLeaderboardMetadata(List.of(new LeaderboardMetadata(1475, HASH, "renamed song",
                "new author", "Expert+", "SoloStandard", 8.1)));

        Score after = repository.loadScores("player-1").getFirst();
        assertThat(Files.readString(tempDir.resolve("player-1.json"))).isEqualTo(originalEvents);
        assertThat(after.timeSet()).isEqualTo(before.timeSet());
        assertThat(after.timeSetMillis()).isEqualTo(before.timeSetMillis());
        assertThat(after.accuracy()).isEqualTo(before.accuracy());
        assertThat(after.songName()).isEqualTo("renamed song");
        assertThat(after.stars()).isEqualTo(8.1);
    }

    @Test
    void emptyScoreHistoryStillTracksPlayer() {
        ScoreFileRepository repository = createRepository();
        repository.addScores(List.of(), "player-without-scores");

        assertThat(repository.getAllPlayerIds()).containsExactly("player-without-scores");
        assertThat(repository.loadScores("player-without-scores")).isEmpty();
        assertThat(repository.mostRecentScoreDate("player-without-scores")).isEmpty();
    }

    private ScoreFileRepository createRepository() {
        return new ScoreFileRepository(new ObjectMapper(), new ScoresProperties(tempDir.toString()));
    }

    private static ScoreRecord scoreRecord(long leaderboardId, LocalDateTime date, double accuracy,
                                           String difficulty, double stars) {
        return new ScoreRecord(
                new ScoreEvent(leaderboardId, date, date.toInstant(java.time.ZoneOffset.UTC).toEpochMilli(),
                        accuracy, HASH),
                new LeaderboardMetadata(leaderboardId, HASH, "song", "author", difficulty, "SoloStandard", stars));
    }
}
