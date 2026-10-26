package ch.lonelyporter.statsapp.integration.scoresaber;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.scores")
public record ScoresProperties(String storagePath) {
}
