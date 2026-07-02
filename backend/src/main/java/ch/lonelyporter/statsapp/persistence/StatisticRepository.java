package ch.lonelyporter.statsapp.persistence;

import ch.lonelyporter.statsapp.StorageProperties;
import ch.lonelyporter.statsapp.exception.StatisticConflictException;
import ch.lonelyporter.statsapp.exception.StatisticNotFoundException;
import ch.lonelyporter.statsapp.exception.StatisticStorageException;
import ch.lonelyporter.statsapp.web.model.Statistic;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Stream;

@Repository
@RequiredArgsConstructor
public class StatisticRepository {

    private static final String ARCHIVED_FOLDER = "archived";
    private static final String RESERVED_ID = "archived";

    private final StorageProperties storageProperties;
    private final ObjectMapper objectMapper;

    public void save(Statistic statistic) {
        try {
            validateWritableId(statistic.getId());
            if (Files.exists(archivedFile(statistic.getId()))) {
                throw new StatisticConflictException("Statistic is archived: " + statistic.getId());
            }

            writeStatistic(activeFolder(), statistic);
        } catch (IOException e) {
            throw new StatisticStorageException("Failed to save statistic: " + statistic.getId(), e);
        }
    }

    public Statistic findById(String id) {
        Path activeFile = activeFile(id);
        if (Files.exists(activeFile)) {
            return readFile(activeFile);
        }

        Path archivedFile = archivedFile(id);
        if (Files.exists(archivedFile)) {
            return readFile(archivedFile);
        }

        throw new StatisticNotFoundException(id);
    }

    public List<Statistic> findAll() {
        return readFolder(activeFolder());
    }

    public List<Statistic> findAllArchived() {
        return readFolder(archivedFolder());
    }

    public boolean isArchived(String id) {
        boolean activeExists = Files.exists(activeFile(id));
        boolean archivedExists = Files.exists(archivedFile(id));

        if (!activeExists && !archivedExists) {
            throw new StatisticNotFoundException(id);
        }

        return archivedExists;
    }

    public void toggleArchive(String id) {
        try {
            Path activeFile = activeFile(id);
            Path archivedFile = archivedFile(id);
            boolean activeExists = Files.exists(activeFile);
            boolean archivedExists = Files.exists(archivedFile);

            if (!activeExists && !archivedExists) {
                throw new StatisticNotFoundException(id);
            }

            if (activeExists && archivedExists) {
                throw new StatisticConflictException("Statistic exists in both active and archived storage: " + id);
            }

            if (activeExists) {
                moveStatistic(activeFile, archivedFile);
            } else {
                moveStatistic(archivedFile, activeFile);
            }
        } catch (IOException e) {
            throw new StatisticStorageException("Failed to toggle archive state for statistic: " + id, e);
        }
    }

    public void deleteById(String id) {
        try {
            Files.deleteIfExists(activeFile(id));
            Files.deleteIfExists(archivedFile(id));
        } catch (IOException e) {
            throw new StatisticStorageException("Failed to delete statistic: " + id, e);
        }
    }

    private List<Statistic> readFolder(Path folder) {
        try {
            Files.createDirectories(folder);
        } catch (IOException e) {
            throw new StatisticStorageException("Failed create statistics Folder", e);
        }

        try (Stream<Path> files = Files.list(folder)) {
            return files
                    .filter(this::isJsonFile)
                    .map(this::readFile)
                    .toList();
        } catch (IOException e) {
            throw new StatisticStorageException("Failed to find statistics", e);
        }
    }

    private void writeStatistic(Path folder, Statistic statistic) throws IOException {
        Files.createDirectories(folder);
        sortDataPointsByDate(statistic);
        Path file = folder.resolve(statistic.getId() + ".json");
        objectMapper.writeValue(file.toFile(), statistic);
    }

    private void moveStatistic(Path source, Path target) throws IOException {
        Files.createDirectories(target.getParent());
        Files.move(source, target);
    }

    private boolean isJsonFile(Path path) {
        return path.toString().endsWith(".json");
    }

    private void validateWritableId(String id) {
        if (RESERVED_ID.equals(id)) {
            throw new StatisticConflictException("Statistic id is reserved: " + id);
        }
    }

    private Path activeFolder() {
        return Paths.get(storageProperties.getStoragePath());
    }

    private Path archivedFolder() {
        return activeFolder().resolve(ARCHIVED_FOLDER);
    }

    private Path activeFile(String id) {
        return activeFolder().resolve(id + ".json");
    }

    private Path archivedFile(String id) {
        return archivedFolder().resolve(id + ".json");
    }

    private Statistic readFile(Path file) {
        try {
            return objectMapper.readValue(file.toFile(), Statistic.class);
        } catch (Exception e) {
            throw new StatisticStorageException("Failed to read statistic from file: " + file, e);
        }
    }

    private void sortDataPointsByDate(Statistic statistic) {
        if (statistic.getDatasets() == null) {
            return;
        }
        statistic.getDatasets().forEach(dataset -> {
            if (dataset.getDataPoints() != null) {
                dataset.getDataPoints().sort(
                        Comparator.comparing(Statistic.DataPoint::getX, Comparator.nullsLast(String::compareTo))
                );
            }
        });
    }
}
