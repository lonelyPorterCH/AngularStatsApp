package ch.lonelyporter.statsapp.domain.scores;

import java.util.Optional;

public interface PlayerRepository {
    Optional<Player> getPlayer(String playerId);

    void savePlayer(Player player);
}
