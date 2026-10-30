package ch.lonelyporter.statsapp.persistence;

import ch.lonelyporter.statsapp.integration.scoresaber.ScoresProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ScoreFileRepositoryLoadTest {
    @TempDir
    Path tempDir;

    @Test
    void readScoresFailsAndPreservesUnreadableScoreFile() throws Exception {
        Path scoreFile = tempDir.resolve("player-1.json");
        String invalidJson = "{ invalid json";
        Files.writeString(scoreFile, invalidJson);
        ScoreFileRepository repository = new ScoreFileRepository(new ObjectMapper(), new ScoresProperties(tempDir.toString()));

        assertThatThrownBy(repository::readScores)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Unable to read scores from file");

        assertThat(Files.readString(scoreFile)).isEqualTo(invalidJson);
    }
}
