package ch.lonelyporter.statsapp.persistence;

import ch.lonelyporter.statsapp.domain.scores.Score;
import ch.lonelyporter.statsapp.domain.scores.ScoreRepository;
import ch.lonelyporter.statsapp.integration.scoresaber.ScoresProperties;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Stream;

@Repository
public class ScoreFileRepository implements ScoreRepository {
    private static final Logger log = LoggerFactory.getLogger(ScoreFileRepository.class);
    public static final String JSON = ".json";
    private final Map<String, List<Score>> playerScores = new HashMap<>();
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
            log.error("Error reading scores from directory: {}", directory, exception);
        }
    }

    @Override
    public List<Score> loadScores(String playerId) {
        return new ArrayList<>(playerScores.getOrDefault(playerId, List.of()));
    }

    @Override
    public void addScores(List<Score> scores, String playerId) {
        List<Score> existingScores = playerScores.computeIfAbsent(playerId, ignored -> new ArrayList<>());
        existingScores.addAll(scores);
        try {
            mapper.writeValue(storageDirectory().resolve(playerId + JSON).toFile(), existingScores);
        } catch (RuntimeException exception) {
            throw new IllegalStateException("Unable to save scores for player " + playerId, exception);
        }
    }

    @Override
    public Optional<LocalDateTime> mostRecentScoreDate(String playerId) {
        return loadScores(playerId).stream().map(Score::timeSet).max(Comparator.naturalOrder());
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
            log.error("Error reading scores from file: {}", file, exception);
        }
    }

    private Path storageDirectory() {
        return Path.of(properties.storagePath());
    }

    private void ensureDirectoryExists(Path directory) {
        try {
            Files.createDirectories(directory);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to create score storage directory " + directory, exception);
        }
    }
}
