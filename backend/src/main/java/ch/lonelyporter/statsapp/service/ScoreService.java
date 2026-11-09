package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.domain.scores.*;
import ch.lonelyporter.statsapp.integration.scoresaber.PlayerScoreHistoryUpdate;
import ch.lonelyporter.statsapp.integration.scoresaber.ScoresaberApiAdapter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;

@Service
public class ScoreService {
    private static final Logger log = LoggerFactory.getLogger(ScoreService.class);
    private final ScoreRepository scoreRepository;
    private final ScoresaberApiAdapter apiAdapter;

    public ScoreService(ScoreRepository scoreRepository, ScoresaberApiAdapter apiAdapter) {
        this.scoreRepository = scoreRepository;
        this.apiAdapter = apiAdapter;
    }

    public List<Score> getScores(String playerId) {
        return scoreRepository.loadScores(playerId);
    }

    public List<TopScore> getTopScores(String playerId) {
        if (playerId == null || !playerId.matches("\\d{1,20}")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "A numeric ScoreSaber player ID is required");
        }
        try {
            return apiAdapter.loadTopScores(playerId);
        } catch (RestClientException exception) {
            throw new ResponseStatusException(HttpStatus.BAD_GATEWAY, "Could not load top scores from ScoreSaber", exception);
        }
    }

    public Map<String, List<Score>> compare(String playerOneId, String playerTwoId) {
        Map<String, List<Score>> scores = new HashMap<>();
        scores.put(playerOneId, getScores(playerOneId));
        scores.put(playerTwoId, getScores(playerTwoId));
        return scores;
    }

    public ScoreUpdateSummary updateAllScores(List<Player> trackedPlayers, boolean refreshLeaderboardStars) {
        List<Player> players = trackedPlayers.stream()
                .sorted(Comparator.comparing(Player::id))
                .toList();
        List<PlayerScoreUpdate> playerUpdates = new ArrayList<>(players.size());
        Map<LeaderboardKey, LeaderboardMetadata> refreshedLeaderboards = new LinkedHashMap<>();

        for (Player player : players) {
            LocalDateTime startDate = scoreRepository.mostRecentScoreDate(player.id()).orElse(LocalDateTime.MIN);
            if (refreshLeaderboardStars) {
                PlayerScoreHistoryUpdate history = apiAdapter.loadScoreHistoryForUpdate(player.id(), startDate);
                logNewScores(player, history.newScores());
                scoreRepository.addScores(history.newScores(), player.id());
                playerUpdates.add(new PlayerScoreUpdate(player.id(), player.name(), history.newScores().size()));
                history.leaderboards().forEach(metadata ->
                        refreshedLeaderboards.put(keyFor(metadata), metadata));
            } else {
                List<ScoreRecord> newScores = apiAdapter.loadScoresStarting(player.id(), startDate);
                logNewScores(player, newScores);
                scoreRepository.addScores(newScores, player.id());
                playerUpdates.add(new PlayerScoreUpdate(player.id(), player.name(), newScores.size()));
            }
        }

        if (!refreshLeaderboardStars) {
            return new ScoreUpdateSummary(playerUpdates, false, 0, 0);
        }

        List<LeaderboardMetadata> cachedLeaderboards = scoreRepository.getAllLeaderboardMetadata();
        Set<LeaderboardKey> historyKeys = refreshedLeaderboards.keySet();
        List<LeaderboardKey> missingLeaderboards = cachedLeaderboards.stream()
                .map(ScoreService::keyFor)
                .filter(key -> !historyKeys.contains(key))
                .toList();
        if (!missingLeaderboards.isEmpty()) {
            throw new IllegalStateException("ScoreSaber player histories did not include cached leaderboards: "
                    + missingLeaderboards);
        }

        Map<LeaderboardKey, LeaderboardMetadata> existingLeaderboards = new HashMap<>();
        cachedLeaderboards.forEach(metadata -> existingLeaderboards.put(keyFor(metadata), metadata));
        List<LeaderboardMetadata> changedLeaderboards = refreshedLeaderboards.values().stream()
                .filter(metadata -> {
                    LeaderboardMetadata existing = existingLeaderboards.get(keyFor(metadata));
                    return existing != null && Double.compare(existing.stars(), metadata.stars()) != 0;
                })
                .toList();
        changedLeaderboards.forEach(metadata -> {
            LeaderboardMetadata existing = existingLeaderboards.get(keyFor(metadata));
            log.debug("Updated stars for song '{}' (leaderboard {}): {} -> {}",
                    metadata.songName(), metadata.leaderboardId(), existing.stars(), metadata.stars());
        });
        int changedStars = changedLeaderboards.size();
        scoreRepository.refreshLeaderboardMetadata(new ArrayList<>(refreshedLeaderboards.values()));
        return new ScoreUpdateSummary(playerUpdates, true, changedStars, cachedLeaderboards.size());
    }

    private static void logNewScores(Player player, List<ScoreRecord> scores) {
        scores.forEach(score ->
                log.debug("Found new score for player '{}' ({}): song '{}' (leaderboard {}), accuracy {}, set at {}",
                        player.name(), player.id(), score.leaderboard().songName(),
                        score.event().leaderboardId(), score.event().accuracy(), score.event().timeSet()));
    }

    private static LeaderboardKey keyFor(LeaderboardMetadata metadata) {
        return new LeaderboardKey(metadata.leaderboardId(), metadata.songHash());
    }

    private record LeaderboardKey(long leaderboardId, String songHash) {
    }
}
