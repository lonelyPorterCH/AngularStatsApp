package ch.lonelyporter.statsapp.persistence;

import ch.lonelyporter.statsapp.domain.scores.Score;
import ch.lonelyporter.statsapp.integration.scoresaber.ScoresProperties;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ScoreFileRepositoryTest {
    @TempDir
    Path tempDir;

    @Test
    void concurrentUpdatesPreserveScoresInMemoryAndOnDisk() throws Exception {
        ScoreFileRepository repository = createRepository();
        int threadCount = 8;
        int scoresPerThread = 10;
        CountDownLatch start = new CountDownLatch(1);

        try (var executor = Executors.newFixedThreadPool(threadCount)) {
            List<Future<?>> futures = new ArrayList<>();
            for (int thread = 0; thread < threadCount; thread++) {
                int threadId = thread;
                futures.add(executor.submit(() -> {
                    start.await();
                    List<Score> scores = new ArrayList<>();
                    for (int scoreIndex = 0; scoreIndex < scoresPerThread; scoreIndex++) {
                        long id = (long) threadId * scoresPerThread + scoreIndex;
                        scores.add(score(id));
                    }
                    repository.addScores(scores, "player-1");
                    return null;
                }));
            }
            start.countDown();
            for (var future : futures) {
                future.get();
            }
        }

        assertThat(repository.loadScores("player-1")).hasSize(threadCount * scoresPerThread);

        ScoreFileRepository reloadedRepository = createRepository();
        reloadedRepository.readScores();
        assertThat(reloadedRepository.loadScores("player-1")).hasSize(threadCount * scoresPerThread);
    }

    @Test
    void failedWriteDoesNotChangeInMemoryScores() throws Exception {
        Path scoreDirectory = Files.createDirectory(tempDir.resolve("player-1.json"));
        Files.writeString(scoreDirectory.resolve("existing"), "keep");
        ScoreFileRepository repository = createRepository();
        List<Score> scores = List.of(score(1));

        assertThatThrownBy(() -> repository.addScores(scores, "player-1"))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("Unable to save scores");

        assertThat(repository.loadScores("player-1")).isEmpty();
        assertThat(Files.readString(scoreDirectory.resolve("existing"))).isEqualTo("keep");
    }

    private ScoreFileRepository createRepository() {
        return new ScoreFileRepository(new ObjectMapper(), new ScoresProperties(tempDir.toString()));
    }

    private static Score score(long id) {
        return new Score("song", "author", id, 100, id, 1.0,
                LocalDateTime.of(2026, 10, 30, 12, 0).plusSeconds(id), "hash-" + id);
    }
}
