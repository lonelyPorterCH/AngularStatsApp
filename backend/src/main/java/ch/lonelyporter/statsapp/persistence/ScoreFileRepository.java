package ch.lonelyporter.statsapp.persistence;

import ch.lonelyporter.statsapp.domain.scores.LeaderboardMetadata;
import ch.lonelyporter.statsapp.domain.scores.Score;
import ch.lonelyporter.statsapp.domain.scores.ScoreEvent;
import ch.lonelyporter.statsapp.domain.scores.ScoreRecord;
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
    private static final String LEADERBOARDS_FILE = "leaderboards.json";
    private static final int LOCK_STRIPES = 64;
    private final Map<String, List<ScoreEvent>> playerScores = new ConcurrentHashMap<>();
    private final Map<LeaderboardKey, LeaderboardMetadata> leaderboards = new ConcurrentHashMap<>();
    private final Object[] playerLocks = createPlayerLocks();
    private final Object leaderboardLock = new Object();
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
        readLeaderboards();
        try (Stream<Path> paths = Files.list(directory)) {
            paths.filter(path -> path.toString().endsWith(JSON)
                            && !path.getFileName().toString().equals("players.json")
                            && !path.getFileName().toString().equals(LEADERBOARDS_FILE))
                    .forEach(this::readPlayerScoreFile);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to list score files in directory " + directory, exception);
        }
    }

    @Override
    public List<Score> loadScores(String playerId) {
        synchronized (lockFor(playerId)) {
            synchronized (leaderboardLock) {
                return new ArrayList<>(playerScores.getOrDefault(playerId, List.of()).stream()
                        .map(this::composeScore)
                        .toList());
            }
        }
    }

    @Override
    public void addScores(List<ScoreRecord> scores, String playerId) {
        synchronized (lockFor(playerId)) {
            List<ScoreEvent> events = new ArrayList<>(scores.size());
            List<LeaderboardMetadata> metadata = new ArrayList<>(scores.size());
            for (ScoreRecord score : scores) {
                validateScoreRecord(score);
                events.add(score.event());
                metadata.add(score.leaderboard());
            }

            synchronized (leaderboardLock) {
                persistNewLeaderboards(metadata);
                List<ScoreEvent> updatedScores = new ArrayList<>(playerScores.getOrDefault(playerId, List.of()));
                updatedScores.addAll(events);
                try {
                    AtomicFileWriter.replace(storageDirectory().resolve(playerId + JSON),
                            mapper.writeValueAsBytes(updatedScores));
                    playerScores.put(playerId, updatedScores);
                } catch (IOException | RuntimeException exception) {
                    throw new IllegalStateException("Unable to save scores for player " + playerId, exception);
                }
            }
        }
    }

    @Override
    public void refreshLeaderboardMetadata(List<LeaderboardMetadata> refreshedLeaderboards) {
        synchronized (leaderboardLock) {
            Map<LeaderboardKey, LeaderboardMetadata> updatedLeaderboards = new LinkedHashMap<>(leaderboards);
            for (LeaderboardMetadata metadata : refreshedLeaderboards) {
                validateLeaderboard(metadata);
                updatedLeaderboards.put(keyFor(metadata), metadata);
            }
            persistLeaderboards(updatedLeaderboards);
            leaderboards.clear();
            leaderboards.putAll(updatedLeaderboards);
        }
    }

    @Override
    public Optional<LocalDateTime> mostRecentScoreDate(String playerId) {
        synchronized (lockFor(playerId)) {
            return playerScores.getOrDefault(playerId, List.of()).stream()
                    .map(ScoreEvent::timeSet)
                    .max(Comparator.naturalOrder());
        }
    }

    @Override
    public List<String> getAllPlayerIds() {
        return new ArrayList<>(playerScores.keySet());
    }

    private void readLeaderboards() {
        Path file = storageDirectory().resolve(LEADERBOARDS_FILE);
        if (!Files.exists(file)) {
            return;
        }
        try {
            List<LeaderboardMetadata> entries = mapper.readValue(file.toFile(), new TypeReference<>() {
            });
            for (LeaderboardMetadata metadata : entries) {
                validateLeaderboard(metadata);
                if (leaderboards.putIfAbsent(keyFor(metadata), metadata) != null) {
                    throw new IllegalStateException("Duplicate leaderboard metadata for " + keyFor(metadata));
                }
            }
        } catch (RuntimeException exception) {
            throw new IllegalStateException("Unable to read leaderboard metadata from file " + file, exception);
        }
    }

    private void readPlayerScoreFile(Path file) {
        try {
            String filename = file.getFileName().toString();
            String playerId = filename.substring(0, filename.length() - JSON.length());
            List<ScoreEvent> events = mapper.readValue(file.toFile(), new TypeReference<>() {
            });
            for (ScoreEvent event : events) {
                validateScoreEvent(event);
                if (!leaderboards.containsKey(new LeaderboardKey(event.leaderboardId(), event.songHash()))) {
                    throw new IllegalStateException("No leaderboard metadata for score event "
                            + event.leaderboardId() + "/" + event.songHash());
                }
            }
            playerScores.put(playerId, events);
        } catch (RuntimeException exception) {
            throw new IllegalStateException("Unable to read scores from file " + file, exception);
        }
    }

    private Score composeScore(ScoreEvent event) {
        LeaderboardMetadata metadata = leaderboards.get(new LeaderboardKey(event.leaderboardId(), event.songHash()));
        if (metadata == null) {
            throw new IllegalStateException("No leaderboard metadata for score event "
                    + event.leaderboardId() + "/" + event.songHash());
        }
        return new Score(metadata.songName(), metadata.levelAuthorName(), event.timeSetMillis(), event.accuracy(),
                event.leaderboardId(), metadata.stars(), event.timeSet(), event.songHash());
    }

    private void persistNewLeaderboards(List<LeaderboardMetadata> additions) {
        Map<LeaderboardKey, LeaderboardMetadata> updatedLeaderboards = new LinkedHashMap<>(leaderboards);
        additions.forEach(metadata -> {
            validateLeaderboard(metadata);
            updatedLeaderboards.putIfAbsent(keyFor(metadata), metadata);
        });
        if (updatedLeaderboards.size() == leaderboards.size()) {
            return;
        }
        persistLeaderboards(updatedLeaderboards);
        leaderboards.clear();
        leaderboards.putAll(updatedLeaderboards);
    }

    private void persistLeaderboards(Map<LeaderboardKey, LeaderboardMetadata> updatedLeaderboards) {
        try {
            AtomicFileWriter.replace(storageDirectory().resolve(LEADERBOARDS_FILE),
                    mapper.writeValueAsBytes(new ArrayList<>(updatedLeaderboards.values())));
        } catch (IOException | RuntimeException exception) {
            throw new IllegalStateException("Unable to save leaderboard metadata", exception);
        }
    }

    private static void validateScoreRecord(ScoreRecord score) {
        if (score == null || score.event() == null) {
            throw new IllegalArgumentException("Score event and leaderboard metadata are required");
        }
        validateScoreEvent(score.event());
        validateLeaderboard(score.leaderboard());
        if (score.event().leaderboardId() != score.leaderboard().leaderboardId()
                || !score.event().songHash().equals(score.leaderboard().songHash())) {
            throw new IllegalArgumentException("Score event and leaderboard metadata identities do not match");
        }
    }

    private static void validateScoreEvent(ScoreEvent event) {
        if (event == null || event.timeSet() == null || event.songHash() == null) {
            throw new IllegalArgumentException("Score event is missing its date or song hash");
        }
    }

    private static void validateLeaderboard(LeaderboardMetadata metadata) {
        if (metadata == null || metadata.songHash() == null || metadata.songName() == null
                || metadata.levelAuthorName() == null) {
            throw new IllegalArgumentException("Leaderboard metadata is missing required song information");
        }
    }

    private static LeaderboardKey keyFor(LeaderboardMetadata metadata) {
        return new LeaderboardKey(metadata.leaderboardId(), metadata.songHash());
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

    private record LeaderboardKey(long leaderboardId, String songHash) {
    }
}
