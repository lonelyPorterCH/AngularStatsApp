package ch.lonelyporter.statsapp.integration.scoresaber;

import ch.lonelyporter.statsapp.domain.scores.SongDifficulty;
import org.junit.jupiter.api.Test;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ScoreMapperTest {
    @Test
    void rejectsMissingTopScoreOrLeaderboardWithAnExplicitError() {
        var score = new PlayerScoresDto.Score(1, 0.9, 900, java.time.Instant.EPOCH, List.of());
        assertThatThrownBy(() -> ScoreMapper.mapTopScore(null))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("top score");
        assertThatThrownBy(() -> ScoreMapper.mapTopScore(new PlayerScoresDto.PlayerScore(null, null)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("top score");
        assertThatThrownBy(() -> ScoreMapper.mapTopScore(new PlayerScoresDto.PlayerScore(score, null)))
                .isInstanceOf(IllegalArgumentException.class).hasMessageContaining("leaderboard");
    }

    @Test
    void mapsNoFailOnlyWhenExactNfModifierIsPresent() {
        assertThat(ScoreMapper.mapNoFail(List.of("NF"))).isTrue();
        assertThat(ScoreMapper.mapNoFail(List.of("FS", "NF"))).isTrue();
        assertThat(ScoreMapper.mapNoFail(List.of())).isFalse();
        assertThat(ScoreMapper.mapNoFail(List.of("FS", "NFS"))).isFalse();
        assertThatThrownBy(() -> ScoreMapper.mapNoFail(null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ScoreMapper.mapNoFail(Arrays.asList("NF", null)))
                .isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void mapsEveryDifficultyToPlaylistNamesAndStripsOnlyTheSoloPrefix() {
        int[] values = {1, 3, 5, 7, 9};
        String[] names = {"Easy", "Normal", "Hard", "Expert", "ExpertPlus"};
        for (int index = 0; index < values.length; index++) {
            assertThat(ScoreMapper.mapDifficulty(new PlayerScoresDto.Difficulty(values[index], "SoloStandard")))
                    .isEqualTo(new SongDifficulty("Standard", names[index]));
        }
        assertThat(ScoreMapper.mapDifficulty(new PlayerScoresDto.Difficulty(9, "Solo90Degree")))
                .isEqualTo(new SongDifficulty("90Degree", "ExpertPlus"));
    }

    @Test
    void rejectsMissingOrUnknownDifficultyRatherThanGuessing() {
        assertThatThrownBy(() -> ScoreMapper.mapDifficulty(null)).isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ScoreMapper.mapDifficulty(new PlayerScoresDto.Difficulty(2, "SoloStandard")))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> ScoreMapper.mapDifficulty(new PlayerScoresDto.Difficulty(5, "Unknown")))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
