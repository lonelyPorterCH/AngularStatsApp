package ch.lonelyporter.statsapp.integration.scoresaber;

import ch.lonelyporter.statsapp.domain.scores.SongDifficulty;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ScoreMapperTest {
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
