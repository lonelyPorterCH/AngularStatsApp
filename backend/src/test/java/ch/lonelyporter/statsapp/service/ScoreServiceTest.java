package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.domain.scores.*;
import ch.lonelyporter.statsapp.integration.scoresaber.PlayerScoreHistoryUpdate;
import ch.lonelyporter.statsapp.integration.scoresaber.ScoresaberApiAdapter;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ScoreServiceTest {
    @Mock
    private ScoreRepository scoreRepository;
    @Mock
    private ScoresaberApiAdapter apiAdapter;

    @Test
    void updateAllPlayersRefreshesCachedStarsAndReportsPerPlayerCounts() {
        Player first = new Player("player-1", "First", "CH", 1);
        Player second = new Player("player-2", "Second", "US", 2);
        LeaderboardMetadata oldMetadata = new LeaderboardMetadata(1475, "hash", "song", "mapper", 6.0);
        LeaderboardMetadata currentMetadata = new LeaderboardMetadata(1475, "hash", "song", "mapper", 7.0);
        LocalDateTime scoreDate = LocalDateTime.of(2026, 11, 5, 12, 0);
        ScoreRecord newScore = new ScoreRecord(
                new ScoreEvent(1475, scoreDate, 1, 99.0, "hash"),
                currentMetadata);
        when(scoreRepository.mostRecentScoreDate(first.id())).thenReturn(Optional.empty());
        when(scoreRepository.mostRecentScoreDate(second.id())).thenReturn(Optional.of(scoreDate));
        when(apiAdapter.loadScoreHistoryForUpdate(first.id(), LocalDateTime.MIN))
                .thenReturn(new PlayerScoreHistoryUpdate(List.of(newScore), List.of(currentMetadata)));
        when(apiAdapter.loadScoreHistoryForUpdate(second.id(), scoreDate))
                .thenReturn(new PlayerScoreHistoryUpdate(List.of(), List.of(currentMetadata)));
        when(scoreRepository.getAllLeaderboardMetadata()).thenReturn(List.of(oldMetadata));

        ScoreUpdateSummary summary = new ScoreService(scoreRepository, apiAdapter)
                .updateAllScores(List.of(second, first), true);

        assertThat(summary.players()).containsExactly(
                new PlayerScoreUpdate(first.id(), "First", 1),
                new PlayerScoreUpdate(second.id(), "Second", 0));
        assertThat(summary.leaderboardStarsRefreshed()).isTrue();
        assertThat(summary.leaderboardsChanged()).isEqualTo(1);
        assertThat(summary.leaderboardsChecked()).isEqualTo(1);
        verify(scoreRepository).addScores(List.of(newScore), first.id());
        verify(scoreRepository).addScores(List.of(), second.id());
        verify(scoreRepository).refreshLeaderboardMetadata(List.of(currentMetadata));
    }

    @Test
    void scoresOnlyUpdateSkipsFullHistoryScanAndLeaderboardRefresh() {
        Player player = new Player("player-1", "First", "CH", 1);
        LocalDateTime latest = LocalDateTime.of(2026, 11, 5, 12, 0);
        List<ScoreRecord> newScores = List.of();
        when(scoreRepository.mostRecentScoreDate(player.id())).thenReturn(Optional.of(latest));
        when(apiAdapter.loadScoresStarting(player.id(), latest)).thenReturn(newScores);

        ScoreUpdateSummary summary = new ScoreService(scoreRepository, apiAdapter)
                .updateAllScores(List.of(player), false);

        assertThat(summary.players()).containsExactly(new PlayerScoreUpdate(player.id(), "First", 0));
        assertThat(summary.leaderboardStarsRefreshed()).isFalse();
        assertThat(summary.leaderboardsChanged()).isZero();
        assertThat(summary.leaderboardsChecked()).isZero();
        verify(scoreRepository).addScores(newScores, player.id());
        verify(scoreRepository, never()).refreshLeaderboardMetadata(org.mockito.ArgumentMatchers.anyList());
        verify(apiAdapter, never()).loadScoreHistoryForUpdate(
                org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.any());
    }
}
