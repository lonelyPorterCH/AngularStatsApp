package ch.lonelyporter.statsapp.persistence;

import ch.lonelyporter.statsapp.StorageProperties;
import ch.lonelyporter.statsapp.domain.harvest.HarvestEntry;
import ch.lonelyporter.statsapp.domain.harvest.HarvestSeason;
import ch.lonelyporter.statsapp.domain.harvest.Plant;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Path;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class HarvestRepositoryTest {
    @TempDir
    Path tempDir;

    private HarvestRepository repository;

    @BeforeEach
    void setUp() {
        StorageProperties properties = new StorageProperties();
        properties.setStoragePath(tempDir.toString());
        repository = new HarvestRepository(properties, new ObjectMapper());
    }

    @Test
    void save_thenFindByYear_roundTripsHarvestData() {
        HarvestSeason season = new HarvestSeason(2026, new ArrayList<>(List.of(
                new Plant("plant-1", "Balcony", new ArrayList<>(List.of(
                        new HarvestEntry("harvest-1", LocalDate.of(2026, 8, 1), 4)))))));

        repository.save(season);

        HarvestSeason loaded = repository.findByYear(2026);
        assertThat(loaded.getYear()).isEqualTo(2026);
        assertThat(loaded.getPlants()).singleElement().extracting(Plant::getName).isEqualTo("Balcony");
        assertThat(loaded.getPlants().getFirst().getHarvests()).singleElement().extracting(HarvestEntry::getQuantity).isEqualTo(4);
        assertThat(repository.findYears()).containsExactly(2026);
    }
}
