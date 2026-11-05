package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.domain.scores.ScoreRecord;
import ch.lonelyporter.statsapp.domain.scores.ScoreRepository;
import ch.lonelyporter.statsapp.integration.scoresaber.ScoresaberApiAdapter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ScoreServiceTest {
    @Mock
    private ScoreRepository scoreRepository;
    @Mock
    private ScoresaberApiAdapter apiAdapter;

    @Test
    void updateFetchesAfterLatestHistoricalEventAndAppendsMappedEvents() {
        String playerId = "player-1";
        LocalDateTime latestDate = LocalDateTime.of(2026, 11, 4, 17, 0);
        List<ScoreRecord> newEvents = List.of();
        ScoreService service = new ScoreService(scoreRepository, apiAdapter);
        when(scoreRepository.mostRecentScoreDate(playerId)).thenReturn(Optional.of(latestDate));
        when(apiAdapter.loadScoresStarting(playerId, latestDate)).thenReturn(newEvents);

        assertThat(service.updateScores(playerId)).isZero();

        verify(apiAdapter).loadScoresStarting(playerId, latestDate);
        verify(scoreRepository).addScores(newEvents, playerId);
    }
}
