package ch.lonelyporter.statsapp.integration.scoresaber;

import ch.lonelyporter.statsapp.domain.scores.Player;

import java.util.Objects;

final class PlayerMapper {
    private PlayerMapper() {
    }

    static Player map(PlayerDetailsDto dto) {
        Objects.requireNonNull(dto, "dto");
        return new Player(dto.id(), dto.name(), dto.country(), dto.stats() == null ? null : dto.stats().rank());
    }
}
