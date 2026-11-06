package ch.lonelyporter.statsapp.domain.scores;

import java.util.Set;

public record SongDifficulty(String characteristic, String name) {
    public SongDifficulty {
        if (characteristic == null || characteristic.isBlank()
                || !Set.of("Easy", "Normal", "Hard", "Expert", "ExpertPlus").contains(name == null ? "" : name)) {
            throw new IllegalArgumentException("A characteristic and a valid Beat Saber difficulty name are required");
        }
    }
}
