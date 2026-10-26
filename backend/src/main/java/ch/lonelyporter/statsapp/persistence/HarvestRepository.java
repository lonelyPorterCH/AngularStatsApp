package ch.lonelyporter.statsapp.persistence;

import ch.lonelyporter.statsapp.StorageProperties;
import ch.lonelyporter.statsapp.domain.harvest.HarvestSeason;
import ch.lonelyporter.statsapp.exception.StatisticNotFoundException;
import ch.lonelyporter.statsapp.exception.StatisticStorageException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.stream.Stream;

@Repository
@RequiredArgsConstructor
public class HarvestRepository {
    private static final String HARVEST_FOLDER = "harvest";
    private static final String JSON = ".json";

    private final StorageProperties storageProperties;
    private final ObjectMapper objectMapper;

    public HarvestSeason findByYear(int year) {
        Path file = seasonFile(year);
        if (!Files.exists(file)) {
            throw new StatisticNotFoundException("Harvest season not found: " + year);
        }
        try {
            return objectMapper.readValue(file.toFile(), HarvestSeason.class);
        } catch (Exception exception) {
            throw new StatisticStorageException("Failed to read harvest season: " + year, exception);
        }
    }

    public HarvestSeason findOrCreate(int year) {
        Path file = seasonFile(year);
        if (!Files.exists(file)) {
            return new HarvestSeason(year, new ArrayList<>());
        }
        return findByYear(year);
    }

    public List<Integer> findYears() {
        Path directory = harvestDirectory();
        try {
            Files.createDirectories(directory);
            try (Stream<Path> paths = Files.list(directory)) {
                return paths.filter(path -> path.getFileName().toString().endsWith(JSON))
                        .map(path -> path.getFileName().toString().replace(JSON, ""))
                        .map(this::parseYear)
                        .filter(Objects::nonNull)
                        .sorted(Comparator.reverseOrder())
                        .toList();
            }
        } catch (IOException exception) {
            throw new StatisticStorageException("Failed to list harvest seasons", exception);
        }
    }

    public void save(HarvestSeason season) {
        try {
            Files.createDirectories(harvestDirectory());
            objectMapper.writeValue(seasonFile(season.getYear()).toFile(), season);
        } catch (IOException exception) {
            throw new StatisticStorageException("Failed to save harvest season: " + season.getYear(), exception);
        }
    }

    private Integer parseYear(String value) {
        try {
            return Integer.valueOf(value);
        } catch (NumberFormatException exception) {
            return null;
        }
    }

    private Path harvestDirectory() {
        return Path.of(storageProperties.getStoragePath()).resolve(HARVEST_FOLDER);
    }

    private Path seasonFile(int year) {
        return harvestDirectory().resolve(year + JSON);
    }
}
