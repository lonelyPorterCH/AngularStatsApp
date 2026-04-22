package ch.lonelyporter.statsapp;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@ConfigurationProperties(prefix = "app.stats")
@Component
@Getter
@Setter
public class StorageProperties {
    private String storagePath;
}
