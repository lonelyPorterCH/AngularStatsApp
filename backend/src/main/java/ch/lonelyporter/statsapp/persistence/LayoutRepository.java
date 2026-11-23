package ch.lonelyporter.statsapp.persistence;

import ch.lonelyporter.statsapp.StorageProperties;
import ch.lonelyporter.statsapp.exception.StatisticStorageException;
import ch.lonelyporter.statsapp.web.model.DashboardLayout;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

@Repository
@RequiredArgsConstructor
public class LayoutRepository {
    private final StorageProperties storageProperties;
    private final ObjectMapper objectMapper;

    public DashboardLayout load() {
        Path file = Path.of(storageProperties.getStoragePath()).resolve("layout.json");
        if (Files.notExists(file)) {
            return new DashboardLayout(List.of(new DashboardLayout.Group("ungrouped", "Ungrouped", List.of())));
        }
        try {
            return objectMapper.readValue(file.toFile(), DashboardLayout.class);
        } catch (Exception e) {
            throw new StatisticStorageException("Failed to read dashboard layout", e);
        }
    }

    public void save(DashboardLayout layout) {
        Path folder = Path.of(storageProperties.getStoragePath());
        try {
            Files.createDirectories(folder);
            AtomicFileWriter.replace(folder.resolve("layout.json"), objectMapper.writeValueAsBytes(layout));
        } catch (IOException e) {
            throw new StatisticStorageException("Failed to save dashboard layout", e);
        }
    }
}
