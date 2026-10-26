package ch.lonelyporter.statsapp.persistence;

import ch.lonelyporter.statsapp.domain.scores.Player;
import ch.lonelyporter.statsapp.domain.scores.PlayerRepository;
import ch.lonelyporter.statsapp.integration.scoresaber.ScoresProperties;
import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Repository;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

@Repository
public class PlayerFileRepository implements PlayerRepository {
    private static final Logger log = LoggerFactory.getLogger(PlayerFileRepository.class);
    private final Map<String, Player> players = new HashMap<>();
    private final ObjectMapper mapper;
    private final ScoresProperties properties;

    public PlayerFileRepository(ObjectMapper mapper, ScoresProperties properties) {
        this.mapper = mapper;
        this.properties = properties;
    }

    @PostConstruct
    void readPlayers() {
        Path file = playersFile();
        ensureDirectoryExists(file.getParent());
        if (!Files.exists(file)) {
            return;
        }
        try {
            mapper.readValue(file.toFile(), new TypeReference<ArrayList<Player>>() {
            }).forEach(player -> players.put(player.id(), player));
        } catch (RuntimeException exception) {
            log.error("Error reading players from file: {}", file, exception);
        }
    }

    @Override
    public Optional<Player> getPlayer(String playerId) {
        return Optional.ofNullable(players.get(playerId));
    }

    @Override
    public void savePlayer(Player player) {
        players.put(player.id(), player);
        try {
            mapper.writeValue(playersFile().toFile(), new ArrayList<>(players.values()));
        } catch (RuntimeException exception) {
            throw new IllegalStateException("Unable to save players", exception);
        }
    }

    private Path playersFile() {
        return Path.of(properties.storagePath()).resolve("players.json");
    }

    private void ensureDirectoryExists(Path directory) {
        try {
            Files.createDirectories(directory);
        } catch (IOException exception) {
            throw new IllegalStateException("Unable to create score storage directory " + directory, exception);
        }
    }
}
