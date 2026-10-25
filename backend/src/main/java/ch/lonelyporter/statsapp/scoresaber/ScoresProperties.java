package ch.lonelyporter.statsapp.scoresaber;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.scores")
public record ScoresProperties(String storagePath) {
}
