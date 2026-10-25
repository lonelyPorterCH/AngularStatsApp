package ch.lonelyporter.statsapp.scores.domain;

import java.util.Optional;

public interface PlayerRepository {
    Optional<Player> getPlayer(String playerId);

    void savePlayer(Player player);
}
