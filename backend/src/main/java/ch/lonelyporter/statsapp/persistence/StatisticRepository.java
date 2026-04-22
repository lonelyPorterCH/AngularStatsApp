package ch.lonelyporter.statsapp.persistence;

import ch.lonelyporter.statsapp.StorageProperties;
import ch.lonelyporter.statsapp.exception.StatisticStorageException;
import ch.lonelyporter.statsapp.web.model.Statistic;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.stream.Stream;

@Repository
@RequiredArgsConstructor
public class StatisticRepository {

    private final StorageProperties storageProperties;
    private final ObjectMapper objectMapper;

    public void save(Statistic statistic) {
        try {
            Path folder = Paths.get(storageProperties.getStoragePath());
            Files.createDirectories(folder);

            Path file = folder.resolve(statistic.getId() + ".json");
            objectMapper.writeValue(file.toFile(), statistic);
        } catch (IOException e) {
            throw new StatisticStorageException("Failed to save statistic: " + statistic.getId(), e);
        }
    }

    public Statistic findById(String id) {
        Path file = Paths.get(storageProperties.getStoragePath()).resolve(id + ".json");
        return objectMapper.readValue(file.toFile(), Statistic.class);
    }

    public List<Statistic> findAll() {
        Path folder = Paths.get(storageProperties.getStoragePath());
        try {
            Files.createDirectories(folder);
        } catch (IOException e) {
            throw new StatisticStorageException("Failed create statistics Folder", e);
        }

        try (Stream<Path> files = Files.list(folder)) {
            return files
                    .filter(p -> p.toString().endsWith(".json"))
                    .map(p -> objectMapper.readValue(p.toFile(), Statistic.class))
                    .toList();
        } catch (IOException e) {
            throw new StatisticStorageException("Failed to find statistics", e);
        }
    }
}