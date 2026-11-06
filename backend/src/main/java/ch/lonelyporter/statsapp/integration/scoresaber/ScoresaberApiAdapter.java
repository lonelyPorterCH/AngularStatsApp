package ch.lonelyporter.statsapp.integration.scoresaber;

import ch.lonelyporter.statsapp.domain.scores.Player;
import ch.lonelyporter.statsapp.domain.scores.LeaderboardMetadata;
import ch.lonelyporter.statsapp.domain.scores.ScoreRecord;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.concurrent.TimeUnit;

@Component
public class ScoresaberApiAdapter {
    private static final Logger log = LoggerFactory.getLogger(ScoresaberApiAdapter.class);
    private static final int PAGE_SIZE = 100;
    private static final long SCORE_PAGE_INTERVAL_NANOS = TimeUnit.MILLISECONDS.toNanos(250);
    private final RestClient restClient;
    private final ScoresaberEndpoints endpoints;
    private long nextScorePageRequestNanos;

    public ScoresaberApiAdapter(RestClient restClient, ScoresaberEndpoints endpoints) {
        this.restClient = restClient;
        this.endpoints = endpoints;
    }

    public List<ScoreRecord> loadScoresStarting(String playerId, LocalDateTime startDate) {
        int page = 1;
        boolean loadNextPage = true;
        List<PlayerScoresDto.PlayerScore> result = new ArrayList<>();
        while (loadNextPage) {
            PlayerScoresDto response = readPage(playerId, page++);
            List<PlayerScoresDto.PlayerScore> playerScores = response.data() == null ? List.of() : response.data();
            List<PlayerScoresDto.PlayerScore> scoresAfter = playerScores.stream()
                    .filter(score -> score.score().createdAt().atOffset(java.time.ZoneOffset.UTC)
                            .toLocalDateTime().isAfter(startDate))
                    .toList();
            result.addAll(scoresAfter);
            loadNextPage = playerScores.size() == scoresAfter.size()
                    && !playerScores.isEmpty()
                    && response.metadata() != null
                    && page <= response.metadata().totalPages();
        }
        return ScoreMapper.map(result);
    }

    public PlayerScoreHistoryUpdate loadScoreHistoryForUpdate(String playerId, LocalDateTime startDate) {
        List<PlayerScoresDto.PlayerScore> history = new ArrayList<>();
        int page = 1;
        int totalPages;
        do {
            PlayerScoresDto response = readPage(playerId, page);
            if (response.metadata() == null) {
                throw new IllegalStateException("ScoreSaber omitted pagination metadata for player " + playerId);
            }
            totalPages = response.metadata().totalPages();
            List<PlayerScoresDto.PlayerScore> pageScores = response.data() == null ? List.of() : response.data();
            if (pageScores.isEmpty()) {
                break;
            }
            history.addAll(pageScores);
            page++;
        } while (page <= totalPages);

        List<ScoreRecord> rankedScores = ScoreMapper.map(history);
        List<ScoreRecord> newScores = rankedScores.stream()
                .filter(score -> score.event().timeSet().isAfter(startDate))
                .toList();
        Map<LeaderboardKey, LeaderboardMetadata> leaderboards = new LinkedHashMap<>();
        ScoreMapper.mapLeaderboards(history).forEach(metadata ->
                leaderboards.put(keyFor(metadata), metadata));
        return new PlayerScoreHistoryUpdate(newScores, new ArrayList<>(leaderboards.values()));
    }

    private PlayerScoresDto readPage(String playerId, int page) {
        awaitScoreSaberRequestSlot();
        PlayerScoresDto response = Objects.requireNonNull(restClient.get()
                .uri(uriBuilder -> uriBuilder.path(endpoints.scoresPath())
                        .queryParam("page", page)
                        .queryParam("limit", PAGE_SIZE)
                        .queryParam("sort", "recent")
                        .build(playerId))
                .retrieve()
                .body(PlayerScoresDto.class), "ScoreSaber returned an empty response body");
        log.debug("Loaded score page {} for player {}", page, playerId);
        return response;
    }

    private synchronized void awaitScoreSaberRequestSlot() {
        while (true) {
            long delayNanos = nextScorePageRequestNanos - System.nanoTime();
            if (delayNanos <= 0) {
                break;
            }
            long delayMillis = TimeUnit.NANOSECONDS.toMillis(delayNanos);
            int additionalNanos = (int) (delayNanos - TimeUnit.MILLISECONDS.toNanos(delayMillis));
            try {
                wait(delayMillis, additionalNanos);
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new IllegalStateException("Interrupted while pacing ScoreSaber score-page requests", exception);
            }
        }
        nextScorePageRequestNanos = System.nanoTime() + SCORE_PAGE_INTERVAL_NANOS;
    }

    private static LeaderboardKey keyFor(LeaderboardMetadata metadata) {
        return new LeaderboardKey(metadata.leaderboardId(), metadata.songHash());
    }

    private record LeaderboardKey(long leaderboardId, String songHash) {
    }

    public Optional<Player> getPlayerDetails(String playerId) {
        awaitScoreSaberRequestSlot();
        try {
            PlayerDetailsDto details = restClient.get()
                    .uri(endpoints.playerDetailsPath(), playerId)
                    .retrieve()
                    .body(PlayerDetailsDto.class);
            return Optional.ofNullable(details).map(PlayerMapper::map);
        } catch (HttpClientErrorException.NotFound exception) {
            log.warn("ScoreSaber player not found: {}", playerId);
            return Optional.empty();
        }
    }
}
