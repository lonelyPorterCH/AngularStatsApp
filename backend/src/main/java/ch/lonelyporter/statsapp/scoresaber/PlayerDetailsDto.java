package ch.lonelyporter.statsapp.scoresaber;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public record PlayerDetailsDto(String id, String name, String country, Stats stats) {
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record Stats(Integer rank) {
    }
}
