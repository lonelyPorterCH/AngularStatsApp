package ch.lonelyporter.statsapp.domain.scores;

public record PlayerScoreUpdate(String playerId, String playerName, int scoresAdded) {
}
