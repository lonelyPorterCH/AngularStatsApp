package ch.lonelyporter.statsapp.persistence;

import ch.lonelyporter.statsapp.domain.scores.LeaderboardMetadata;
import ch.lonelyporter.statsapp.domain.scores.Score;
import ch.lonelyporter.statsapp.domain.scores.ScoreEvent;
import ch.lonelyporter.statsapp.domain.scores.ScoreRecord;
import ch.lonelyporter.statsapp.domain.scores.SongDifficulty;
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
                scoreRecord(407243, FIRST_DATE, 54.0, 6.14),
                scoreRecord(407243, FIRST_DATE.plusDays(2), 61.0, 5.0),
                scoreRecord(407355, FIRST_DATE.plusDays(3), 70.0, 4.65)
        ), "player-1");

        String eventFile = Files.readString(tempDir.resolve("player-1.json"));
        String leaderboardFile = Files.readString(tempDir.resolve("leaderboards.json"));
        assertThat(eventFile).contains("\"leaderboardId\"").doesNotContain("\"songName\"", "\"stars\"");
        assertThat(leaderboardFile).contains("\"songName\"", "\"stars\"", "\"difficulty\"", "\"characteristic\":\"Standard\"");

        ScoreFileRepository reloaded = createRepository();
        reloaded.readScores();
        List<Score> scores = reloaded.loadScores("player-1");

        assertThat(scores).hasSize(3);
        assertThat(scores).extracting(Score::leaderboardId).containsExactly(407243L, 407243L, 407355L);
        assertThat(scores).extracting(Score::songHash).containsOnly(HASH);
        assertThat(scores).extracting(Score::accuracy).containsExactly(54.0, 61.0, 70.0);
        assertThat(scores).extracting(Score::songName).containsOnly("song");
        assertThat(scores).extracting(Score::stars).containsExactly(6.14, 6.14, 4.65);
        assertThat(scores).extracting(Score::difficulty).containsOnly(new SongDifficulty("Standard", "Hard"));
        assertThat(scores).extracting(Score::noFail).containsOnly(true);
        assertThat(reloaded.mostRecentScoreDate("player-1")).contains(FIRST_DATE.plusDays(3));
        assertThat(reloaded.getAllPlayerIds()).containsExactly("player-1");

        String response = new ObjectMapper().writeValueAsString(scores);
        assertThat(response)
                .contains("\"leaderboardId\":407243", "\"songName\":\"song\"", "\"accuracy\":54.0", "\"timeSet\":\"2022-01-19T19:09:08\"")
                .contains("\"difficulty\":{\"characteristic\":\"Standard\",\"name\":\"Hard\"}")
                .contains("\"noFail\":true")
                .doesNotContain("\"id\"", "gameMode");
    }

    @Test
    void refreshingMetadataChangesComposedCacheOnlyAndLeavesHistoricalEventsUnchanged() throws Exception {
        ScoreFileRepository repository = createRepository();
        ScoreRecord historical = scoreRecord(1475, FIRST_DATE, 88.25, 7.2);
        repository.addScores(List.of(historical), "player-1");
        String originalEvents = Files.readString(tempDir.resolve("player-1.json"));
        Score before = repository.loadScores("player-1").getFirst();

        repository.refreshLeaderboardMetadata(List.of(new LeaderboardMetadata(1475, HASH, "renamed song",
                "new author", 8.1, new SongDifficulty("Standard", "Hard"))));

        Score after = repository.loadScores("player-1").getFirst();
        assertThat(Files.readString(tempDir.resolve("player-1.json"))).isEqualTo(originalEvents);
        assertThat(after.timeSet()).isEqualTo(before.timeSet());
        assertThat(after.timeSetMillis()).isEqualTo(before.timeSetMillis());
        assertThat(after.accuracy()).isEqualTo(before.accuracy());
        assertThat(after.noFail()).isTrue();
        assertThat(after.songName()).isEqualTo("song");
        assertThat(after.levelAuthorName()).isEqualTo("author");
        assertThat(after.stars()).isEqualTo(8.1);
    }

    @Test
    void addingScoresDoesNotChangeCachedLeaderboardStars() {
        ScoreFileRepository repository = createRepository();
        repository.addScores(List.of(scoreRecord(1475, FIRST_DATE, 88.25, 7.2)), "player-1");

        repository.addScores(List.of(new ScoreRecord(
                new ScoreEvent(1475, FIRST_DATE.plusDays(2), FIRST_DATE.plusDays(2)
                        .toInstant(java.time.ZoneOffset.UTC).toEpochMilli(), 91.5, HASH, false),
                new LeaderboardMetadata(1475, HASH, "changed name", "changed author", 8.1, null))), "player-1");

        List<Score> scores = repository.loadScores("player-1");
        assertThat(scores).hasSize(2);
        assertThat(scores).extracting(Score::stars).containsExactly(7.2, 7.2);
        assertThat(scores).extracting(Score::songName).containsOnly("song");
        assertThat(scores).extracting(Score::levelAuthorName).containsOnly("author");
        assertThat(scores).extracting(Score::timeSet).containsExactly(FIRST_DATE, FIRST_DATE.plusDays(2));
        assertThat(scores).extracting(Score::accuracy).containsExactly(88.25, 91.5);
        assertThat(scores).extracting(Score::difficulty).containsOnly(new SongDifficulty("Standard", "Hard"));
        assertThat(scores).extracting(Score::noFail).containsExactly(true, false);
    }

    @Test
    void oldEventsWithoutNoFailRemainUnknownRatherThanBecomingFalse() throws Exception {
        Files.writeString(tempDir.resolve("leaderboards.json"), """
                [{"leaderboardId":1475,"songHash":"%s","songName":"song","levelAuthorName":"author","stars":7.2}]
                """.formatted(HASH));
        Files.writeString(tempDir.resolve("123.json"), """
                [{"leaderboardId":1475,"songHash":"%s","timeSet":"2022-01-19T19:09:08",
                  "timeSetMillis":1642619348000,"accuracy":80}]
                """.formatted(HASH));
        ScoreFileRepository repository = createRepository();
        repository.readScores();

        assertThat(repository.loadScores("123").getFirst().noFail()).isNull();
        assertThat(new ObjectMapper().writeValueAsString(repository.loadScores("123")))
                .contains("\"noFail\":null");
    }

    @Test
    void oldFilesRemainReadableAndRefreshBackfillsDifficultyWithoutChangingStarsOrEvents() throws Exception {
        Files.writeString(tempDir.resolve("leaderboards.json"), """
                [{"leaderboardId":1475,"songHash":"%s","songName":"song","levelAuthorName":"author","stars":7.2}]
                """.formatted(HASH));
        ScoreFileRepository repository = createRepository();
        repository.readScores();
        repository.addScores(List.of(new ScoreRecord(
                new ScoreEvent(1475, FIRST_DATE, 123, 80, HASH, null),
                new LeaderboardMetadata(1475, HASH, "song", "author", 7.2, null))), "player-1");
        assertThat(repository.loadScores("player-1").getFirst().difficulty()).isNull();
        String originalEvents = Files.readString(tempDir.resolve("player-1.json"));

        repository.refreshLeaderboardMetadata(List.of(
                new LeaderboardMetadata(1475, HASH, "renamed", "renamed", 7.2, new SongDifficulty("OneSaber", "ExpertPlus"))));

        ScoreFileRepository reloaded = createRepository();
        reloaded.readScores();
        Score score = reloaded.loadScores("player-1").getFirst();
        assertThat(score.difficulty()).isEqualTo(new SongDifficulty("OneSaber", "ExpertPlus"));
        assertThat(score.stars()).isEqualTo(7.2);
        assertThat(score.songName()).isEqualTo("song");
        assertThat(Files.readString(tempDir.resolve("player-1.json"))).isEqualTo(originalEvents);
    }

    @Test
    void addingNewScoresBackfillsDifficultyButDoesNotRefreshStars() {
        ScoreFileRepository repository = createRepository();
        repository.addScores(List.of(new ScoreRecord(new ScoreEvent(1475, FIRST_DATE, 123, 80, HASH, null),
                new LeaderboardMetadata(1475, HASH, "song", "author", 7.2, null))), "player-1");

        repository.addScores(List.of(scoreRecord(1475, FIRST_DATE.plusDays(1), 90, 8.1)), "player-1");

        assertThat(repository.loadScores("player-1")).extracting(Score::difficulty)
                .containsOnly(new SongDifficulty("Standard", "Hard"));
        assertThat(repository.loadScores("player-1")).extracting(Score::stars).containsOnly(7.2);
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

    private static ScoreRecord scoreRecord(long leaderboardId, LocalDateTime date, double accuracy, double stars) {
        return new ScoreRecord(
                new ScoreEvent(leaderboardId, date, date.toInstant(java.time.ZoneOffset.UTC).toEpochMilli(),
                        accuracy, HASH, true),
                new LeaderboardMetadata(leaderboardId, HASH, "song", "author", stars, new SongDifficulty("Standard", "Hard")));
    }
}
