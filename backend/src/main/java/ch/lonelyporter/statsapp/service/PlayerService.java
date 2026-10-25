package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.scores.Player;
import ch.lonelyporter.statsapp.scores.PlayerRepository;
import ch.lonelyporter.statsapp.scores.ScoreRepository;
import ch.lonelyporter.statsapp.scoresaber.ScoresaberApiAdapter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

@Service
public class PlayerService {
    private static final Logger log = LoggerFactory.getLogger(PlayerService.class);
    private final PlayerRepository playerRepository;
    private final ScoreRepository scoreRepository;
    private final ScoresaberApiAdapter apiAdapter;

    public PlayerService(PlayerRepository playerRepository, ScoreRepository scoreRepository,
                         ScoresaberApiAdapter apiAdapter) {
        this.playerRepository = playerRepository;
        this.scoreRepository = scoreRepository;
        this.apiAdapter = apiAdapter;
    }

    public Player getPlayer(String playerId) {
        Optional<Player> player = playerRepository.getPlayer(playerId);
        return player.orElseGet(() -> apiAdapter.getPlayerDetails(playerId)
                .map(fetchedPlayer -> {
                    playerRepository.savePlayer(fetchedPlayer);
                    return fetchedPlayer;
                })
                .orElseGet(() -> new Player(playerId, playerId, "", null)));
    }

    public List<Player> getAllPlayers() {
        return scoreRepository.getAllPlayerIds().stream().map(this::getPlayer).toList();
    }

    public List<String> getAllPlayerIds() {
        return scoreRepository.getAllPlayerIds();
    }

    public void updatePlayers() {
        scoreRepository.getAllPlayerIds().forEach(this::updatePlayerRank);
    }

    private void updatePlayerRank(String playerId) {
        apiAdapter.getPlayerDetails(playerId)
                .ifPresentOrElse(playerRepository::savePlayer,
                        () -> log.warn("Failed to update rank for player: {}", playerId));
    }
}
