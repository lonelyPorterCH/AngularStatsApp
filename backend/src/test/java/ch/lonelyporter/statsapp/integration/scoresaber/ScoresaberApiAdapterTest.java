package ch.lonelyporter.statsapp.integration.scoresaber;

import ch.lonelyporter.statsapp.domain.scores.LeaderboardMetadata;
import ch.lonelyporter.statsapp.domain.scores.SongDifficulty;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withServerError;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class ScoresaberApiAdapterTest {
    @Test
    void topScoresRequestsTenByPpAndFetchesAgainInsteadOfCachingOrPersistingPp() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://scoresaber.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ScoresaberApiAdapter adapter = new ScoresaberApiAdapter(builder.build(),
                new ScoresaberEndpoints("/api/v2/players/{playerId}/scores", "/api/v2/players/{playerId}"));
        for (String page : new String[]{pageOne(), pageOne().replace("0.90", "0.91")}) {
            server.expect(requestTo("https://scoresaber.test/api/v2/players/123/scores?page=1&limit=10&sort=top"))
                    .andExpect(header("Cache-Control", "no-cache, no-store"))
                    .andRespond(withSuccess(page, MediaType.APPLICATION_JSON));
        }

        var first = adapter.loadTopScores("123");
        var second = adapter.loadTopScores("123");

        assertThat(first).hasSize(1);
        assertThat(first.getFirst().leaderboardId()).isEqualTo(1475);
        assertThat(first.getFirst().accuracy()).isEqualTo(90);
        assertThat(first.getFirst().timeSet()).isEqualTo(LocalDateTime.of(2022, 1, 19, 19, 9, 8));
        assertThat(second.getFirst().accuracy()).isEqualTo(91);
        server.verify();
    }

    @Test
    void topScoreFailuresAndMissingDataAreNotReportedAsSuccessfulEmptyResults() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://scoresaber.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ScoresaberApiAdapter adapter = new ScoresaberApiAdapter(builder.build(),
                new ScoresaberEndpoints("/api/v2/players/{playerId}/scores", "/api/v2/players/{playerId}"));
        String url = "https://scoresaber.test/api/v2/players/123/scores?page=1&limit=10&sort=top";
        server.expect(requestTo(url)).andRespond(withServerError());
        server.expect(requestTo(url)).andRespond(withSuccess("{\"data\":null}", MediaType.APPLICATION_JSON));
        server.expect(requestTo(url)).andRespond(withSuccess("{\"data\":[]}", MediaType.APPLICATION_JSON));

        assertThatThrownBy(() -> adapter.loadTopScores("123")).isInstanceOf(org.springframework.web.client.RestClientException.class);
        assertThatThrownBy(() -> adapter.loadTopScores("123")).isInstanceOf(IllegalStateException.class);
        assertThat(adapter.loadTopScores("123")).isEmpty();
        server.verify();
    }

    @Test
    void fullHistoryScanReadsEveryPageButReturnsOnlyNewRankedEventsAndAllLeaderboardMetadata() {
        RestClient.Builder builder = RestClient.builder().baseUrl("https://scoresaber.test");
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        ScoresaberApiAdapter adapter = new ScoresaberApiAdapter(
                builder.build(),
                new ScoresaberEndpoints("/api/v2/players/{playerId}/scores", "/api/v2/players/{playerId}"));
        server.expect(requestTo("https://scoresaber.test/api/v2/players/player-1/scores?page=1&limit=100&sort=recent"))
                .andRespond(withSuccess(pageOne(), MediaType.APPLICATION_JSON));
        server.expect(requestTo("https://scoresaber.test/api/v2/players/player-1/scores?page=2&limit=100&sort=recent"))
                .andRespond(withSuccess(pageTwo(), MediaType.APPLICATION_JSON));

        PlayerScoreHistoryUpdate result = adapter.loadScoreHistoryForUpdate(
                "player-1", LocalDateTime.of(2022, 1, 20, 0, 0));

        server.verify();
        assertThat(result.newScores()).hasSize(1);
        assertThat(result.newScores().getFirst().event().accuracy()).isEqualTo(95.0);
        assertThat(result.newScores().getFirst().event().noFail()).isTrue();
        assertThat(result.leaderboards()).hasSize(2);
        assertThat(result.leaderboards()).extracting(LeaderboardMetadata::leaderboardId)
                .containsExactly(1475L, 2000L);
        assertThat(result.leaderboards()).extracting(LeaderboardMetadata::stars).containsExactly(7.5, 0.0);
        assertThat(result.newScores().getFirst().leaderboard().difficulty())
                .isEqualTo(new SongDifficulty("Standard", "Hard"));
        assertThat(result.leaderboards().get(1).difficulty()).isEqualTo(new SongDifficulty("OneSaber", "ExpertPlus"));
    }

    private static String pageOne() {
        return """
                {
                  "data": [{
                    "score": {"id": 10, "accuracy": 0.90, "modifiedScore": 900, "createdAt": "2022-01-19T19:09:08Z", "mods": []},
                    "leaderboard": {
                      "id": 1475,
                      "difficulty": {"difficulty": 5, "gameMode": "SoloStandard", "rawDifficulty": "_Hard_SoloStandard"},
                      "map": {"hash": "song-hash", "songName": "Song", "levelAuthorName": "Mapper"},
                      "maxScore": 1000,
                      "realm": {"leaderboardStatus": "RANKED", "stars": 7.5}
                    }
                  }],
                  "metadata": {"page": 1, "itemsPerPage": 100, "totalItems": 2, "totalPages": 2}
                }
                """;
    }

    private static String pageTwo() {
        return """
                {
                  "data": [
                    {
                      "score": {"id": 11, "accuracy": 0.95, "modifiedScore": 950, "createdAt": "2022-01-21T19:09:08Z", "mods": ["FS", "NF"]},
                      "leaderboard": {
                        "id": 1475,
                        "difficulty": {"difficulty": 5, "gameMode": "SoloStandard"},
                        "map": {"hash": "song-hash", "songName": "Song", "levelAuthorName": "Mapper"},
                        "maxScore": 1000,
                        "realm": {"leaderboardStatus": "RANKED", "stars": 7.5}
                      }
                    },
                    {
                      "score": {"id": 12, "accuracy": 0.80, "modifiedScore": 800, "createdAt": "2022-01-22T19:09:08Z", "mods": []},
                      "leaderboard": {
                        "id": 2000,
                        "difficulty": {"difficulty": 9, "gameMode": "SoloOneSaber"},
                        "map": {"hash": "another-hash", "songName": "Other", "levelAuthorName": "Another Mapper"},
                        "maxScore": 1000,
                        "realm": {"leaderboardStatus": "UNRANKED", "stars": 0.0}
                      }
                    }
                  ],
                  "metadata": {"page": 2, "itemsPerPage": 100, "totalItems": 3, "totalPages": 2}
                }
                """;
    }
}
