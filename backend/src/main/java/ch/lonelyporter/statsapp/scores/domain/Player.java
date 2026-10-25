package ch.lonelyporter.statsapp.scores.domain;

public record Player(String id, String name, String country, Integer rank) {

    public Player {
        if (id == null || id.isBlank()) {
            throw new IllegalArgumentException("Player ID cannot be null or blank");
        }
        if (name == null || name.isBlank()) {
            name = id;
        }
    }
}
