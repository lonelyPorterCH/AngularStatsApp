package ch.lonelyporter.statsapp.scores.scoresaber;

import ch.lonelyporter.statsapp.scores.ScoresaberEndpoints;
import ch.lonelyporter.statsapp.scores.domain.Player;
import ch.lonelyporter.statsapp.scores.domain.Score;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.HttpClientErrorException;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.Optional;

@Component
public class ScoresaberApiAdapter {
    private static final Logger log = LoggerFactory.getLogger(ScoresaberApiAdapter.class);
    private static final int PAGE_SIZE = 100;
    private final RestClient restClient;
    private final ScoresaberEndpoints endpoints;

    public ScoresaberApiAdapter(RestClient restClient, ScoresaberEndpoints endpoints) {
        this.restClient = restClient;
        this.endpoints = endpoints;
    }

    public List<Score> loadScoresStarting(String playerId, LocalDateTime startDate) {
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

    private PlayerScoresDto readPage(String playerId, int page) {
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

    public Optional<Player> getPlayerDetails(String playerId) {
        try {
            PlayerDetailsDto details = restClient.get()
                    .uri(endpoints.playerDetailsPath(), playerId)
                    .retrieve()
                    .body(PlayerDetailsDto.class);
            return Optional.ofNullable(details).map(PlayerMapper::map);
        } catch (HttpClientErrorException.NotFound _) {
            log.warn("ScoreSaber player not found: {}", playerId);
            return Optional.empty();
        }
    }
}
