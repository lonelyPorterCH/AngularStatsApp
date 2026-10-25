package ch.lonelyporter.statsapp.scores;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.client.RestClient;

@Configuration
@EnableConfigurationProperties(ScoresProperties.class)
public class ScoresConfiguration {

    @Bean
    public RestClient scoresaberRestClient(RestClient.Builder builder,
                                           @Value("${scoresaber.base-url:https://scoresaber.com}") String baseUrl) {
        return builder.baseUrl(baseUrl).build();
    }

    @Bean
    public ScoresaberEndpoints scoresaberEndpoints(
            @Value("${scoresaber.scores-path:/api/v2/players/{playerId}/scores}") String scoresPath,
            @Value("${scoresaber.player-details-path:/api/v2/players/{playerId}}") String playerDetailsPath) {
        return new ScoresaberEndpoints(scoresPath, playerDetailsPath);
    }
}
