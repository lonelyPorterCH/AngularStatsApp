package ch.lonelyporter.statsapp.web.api;

import ch.lonelyporter.statsapp.domain.scores.TopScore;
import ch.lonelyporter.statsapp.service.PlayerService;
import ch.lonelyporter.statsapp.service.ScoreService;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ScoresApiControllerTest {
    @Test
    void topScoresResponseDisablesCachingAndExposesOnlyLivePlayIdentity() throws Exception {
        ScoreService scores = mock(ScoreService.class);
        when(scores.getTopScores("123")).thenReturn(List.of(
                new TopScore(7, "hash", LocalDateTime.of(2026, 1, 1, 12, 0), 90)));
        var mvc = MockMvcBuilders.standaloneSetup(new ScoresApiController(scores, mock(PlayerService.class))).build();

        mvc.perform(get("/api/scores/players/123/scores/top"))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(jsonPath("$[0].leaderboardId").value(7))
                .andExpect(jsonPath("$[0].timeSet").value("2026-01-01T12:00:00"))
                .andExpect(jsonPath("$[0].accuracy").value(90))
                .andExpect(jsonPath("$[0].pp").doesNotExist());
        verify(scores).getTopScores("123");
    }
}
