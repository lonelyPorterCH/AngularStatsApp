package ch.lonelyporter.statsapp.scores;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.scores")
public record ScoresProperties(String storagePath) {
}
