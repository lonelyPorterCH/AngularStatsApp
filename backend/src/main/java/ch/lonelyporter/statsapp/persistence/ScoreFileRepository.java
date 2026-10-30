package ch.lonelyporter.statsapp.persistence;

import ch.lonelyporter.statsapp.domain.scores.Score;
import ch.lonelyporter.statsapp.domain.scores.ScoreRepository;
import ch.lonelyporter.statsapp.integration.scoresaber.ScoresProperties;
import jakarta.annotation.PostConstruct;
import org.springframework.stereotype.Repository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Stream;

@Repository
public class ScoreFileRepository implements ScoreRepository {
    public static final String JSON = ".json";
    private static final int LOCK_STRIPES = 64;
    private final Map<String, List<Score>> playerScores = new ConcurrentHashMap<>();
    private final Object[] playerLocks = createPlayerLocks();
    private final ObjectMapper mapper;
    private final ScoresProperties properties;

    public ScoreFileRepository(ObjectMapper mapper, ScoresProperties properties) {
        this.mapper = mapper;
        this.properties = properties;
    }

    @PostConstruct
    void readScores() {
        Path directory = storageDirectory();
        ensureDirectoryExists(directory);
        try (Stream<Path> paths = Files.list(directory)) {
            paths.filter(path -> path.toString().endsWith(JSON)
                            && !path.getFileName().toString().equals("players.json"))
                    .forEach(this::readPlayerScoreFile);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to list score files in directory " + directory, exception);
        }
    }

    @Override
    public List<Score> loadScores(String playerId) {
        synchronized (lockFor(playerId)) {
            return new ArrayList<>(playerScores.getOrDefault(playerId, List.of()));
        }
    }

    @Override
    public void addScores(List<Score> scores, String playerId) {
        synchronized (lockFor(playerId)) {
            List<Score> existingScores = playerScores.get(playerId);
            if (existingScores == null) {
                existingScores = new ArrayList<>();
            }
            int previousSize = existingScores.size();
            existingScores.addAll(scores);
            try {
                byte[] json = mapper.writeValueAsBytes(existingScores);
                AtomicFileWriter.replace(storageDirectory().resolve(playerId + JSON), json);
                playerScores.put(playerId, existingScores);
            } catch (IOException | RuntimeException exception) {
                existingScores.subList(previousSize, existingScores.size()).clear();
                throw new IllegalStateException("Unable to save scores for player " + playerId, exception);
            }
        }
    }

    @Override
    public Optional<LocalDateTime> mostRecentScoreDate(String playerId) {
        synchronized (lockFor(playerId)) {
            return playerScores.getOrDefault(playerId, List.of()).stream()
                    .map(Score::timeSet)
                    .max(Comparator.naturalOrder());
        }
    }

    @Override
    public List<String> getAllPlayerIds() {
        return new ArrayList<>(playerScores.keySet());
    }

    private void readPlayerScoreFile(Path file) {
        try {
            String filename = file.getFileName().toString();
            String playerId = filename.substring(0, filename.length() - JSON.length());
            playerScores.put(playerId, mapper.readValue(file.toFile(), new TypeReference<>() {
            }));
        } catch (RuntimeException exception) {
            throw new IllegalStateException("Unable to read scores from file " + file, exception);
        }
    }

    private Path storageDirectory() {
        return Path.of(properties.storagePath());
    }

    private Object lockFor(String playerId) {
        return playerLocks[Math.floorMod(playerId.hashCode(), playerLocks.length)];
    }

    private static Object[] createPlayerLocks() {
        Object[] locks = new Object[LOCK_STRIPES];
        Arrays.setAll(locks, ignored -> new Object());
        return locks;
    }

    private void ensureDirectoryExists(Path directory) {
        try {
            Files.createDirectories(directory);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to create score storage directory " + directory, exception);
        }
    }
}
