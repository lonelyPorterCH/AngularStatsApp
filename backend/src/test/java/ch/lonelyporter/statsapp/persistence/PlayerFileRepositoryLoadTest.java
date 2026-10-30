package ch.lonelyporter.statsapp.persistence;

import ch.lonelyporter.statsapp.integration.scoresaber.ScoresProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class PlayerFileRepositoryLoadTest {
    @TempDir
    Path tempDir;

    @Test
    void readPlayersFailsAndPreservesUnreadablePlayerFile() throws Exception {
        Path playerFile = tempDir.resolve("players.json");
        String invalidJson = "{ invalid json";
        Files.writeString(playerFile, invalidJson);
        PlayerFileRepository repository = new PlayerFileRepository(new ObjectMapper(), new ScoresProperties(tempDir.toString()));

        assertThatThrownBy(repository::readPlayers)
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Unable to read players from file");

        assertThat(Files.readString(playerFile)).isEqualTo(invalidJson);
    }
}
