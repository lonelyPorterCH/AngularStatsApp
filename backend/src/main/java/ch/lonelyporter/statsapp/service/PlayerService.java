package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.domain.scores.Player;
import ch.lonelyporter.statsapp.domain.scores.PlayerRepository;
import ch.lonelyporter.statsapp.domain.scores.ScoreRepository;
import ch.lonelyporter.statsapp.integration.scoresaber.ScoresaberApiAdapter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
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

    public Player addPlayer(String playerId) {
        if (playerId == null || !playerId.matches("\\d{1,20}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A numeric ScoreSaber player ID is required");
        }
        if (scoreRepository.getAllPlayerIds().contains(playerId)) {
            return getPlayer(playerId);
        }
        try {
            Player player = apiAdapter.getPlayerDetails(playerId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "ScoreSaber player not found"));
            var scores = apiAdapter.loadScoresStarting(playerId, LocalDateTime.MIN);
            playerRepository.savePlayer(player);
            scoreRepository.addScores(scores, playerId);
            return player;
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not load player from ScoreSaber", exception);
        }
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
