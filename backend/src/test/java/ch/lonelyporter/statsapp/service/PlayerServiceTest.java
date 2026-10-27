package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.domain.scores.Player;
import ch.lonelyporter.statsapp.domain.scores.PlayerRepository;
import ch.lonelyporter.statsapp.domain.scores.Score;
import ch.lonelyporter.statsapp.domain.scores.ScoreRepository;
import ch.lonelyporter.statsapp.integration.scoresaber.ScoresaberApiAdapter;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PlayerServiceTest {
    private static final String PLAYER_ID = "76561198000000000";
    private final Player player = new Player(PLAYER_ID, "New player", "CH", 42);
    @Mock
    private PlayerRepository playerRepository;
    @Mock
    private ScoreRepository scoreRepository;
    @Mock
    private ScoresaberApiAdapter apiAdapter;
    private PlayerService service;

    @BeforeEach
    void setUp() {
        service = new PlayerService(playerRepository, scoreRepository, apiAdapter);
    }

    @Test
    void addPlayerImportsProfileAndScores() {
        List<Score> scores = List.of(mock(Score.class));
        when(apiAdapter.getPlayerDetails(PLAYER_ID)).thenReturn(Optional.of(player));
        when(apiAdapter.loadScoresStarting(PLAYER_ID, LocalDateTime.MIN)).thenReturn(scores);

        assertThat(service.addPlayer(PLAYER_ID)).isEqualTo(player);

        verify(playerRepository).savePlayer(player);
        verify(scoreRepository).addScores(scores, PLAYER_ID);
    }

    @Test
    void addPlayerTracksPlayersEvenWithoutRankedScores() {
        when(apiAdapter.getPlayerDetails(PLAYER_ID)).thenReturn(Optional.of(player));
        when(apiAdapter.loadScoresStarting(PLAYER_ID, LocalDateTime.MIN)).thenReturn(List.of());

        service.addPlayer(PLAYER_ID);

        verify(playerRepository).savePlayer(player);
        verify(scoreRepository).addScores(List.of(), PLAYER_ID);
    }

    @Test
    void addPlayerDoesNotImportDuplicateScores() {
        when(scoreRepository.getAllPlayerIds()).thenReturn(List.of(PLAYER_ID));
        when(playerRepository.getPlayer(PLAYER_ID)).thenReturn(Optional.of(player));

        assertThat(service.addPlayer(PLAYER_ID)).isEqualTo(player);

        verifyNoInteractions(apiAdapter);
        verify(scoreRepository, never()).addScores(anyList(), anyString());
        verify(playerRepository, never()).savePlayer(any());
    }

    @Test
    void addPlayerRejectsInvalidIdsBeforeAccessingStorageOrScoresaber() {
        for (String invalidId : List.of("", "abc", "../players", "123/456", "123456789012345678901")) {
            var exception = assertThrows(ResponseStatusException.class, () -> service.addPlayer(invalidId));
            assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        }
        verifyNoInteractions(apiAdapter, playerRepository, scoreRepository);
    }

    @Test
    void addPlayerDoesNotSaveUnknownPlayers() {
        when(apiAdapter.getPlayerDetails(PLAYER_ID)).thenReturn(Optional.empty());

        var exception = assertThrows(ResponseStatusException.class, () -> service.addPlayer(PLAYER_ID));

        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        verifyNoInteractions(playerRepository);
        verify(apiAdapter, never()).loadScoresStarting(anyString(), any());
        verify(scoreRepository, never()).addScores(anyList(), anyString());
    }

    @Test
    void addPlayerDoesNotSaveWhenScoreImportFails() {
        when(apiAdapter.getPlayerDetails(PLAYER_ID)).thenReturn(Optional.of(player));
        when(apiAdapter.loadScoresStarting(PLAYER_ID, LocalDateTime.MIN))
                .thenThrow(new RestClientException("ScoreSaber unavailable"));

        var exception = assertThrows(ResponseStatusException.class, () -> service.addPlayer(PLAYER_ID));

        assertThat(exception.getStatusCode()).isEqualTo(HttpStatus.BAD_GATEWAY);
        verifyNoInteractions(playerRepository);
        verify(scoreRepository, never()).addScores(anyList(), anyString());
    }
}