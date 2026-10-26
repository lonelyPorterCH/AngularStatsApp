package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.StorageProperties;
import ch.lonelyporter.statsapp.persistence.HarvestRepository;
import ch.lonelyporter.statsapp.web.model.HarvestView;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Path;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class HarvestServiceTest {
    @TempDir
    Path tempDir;

    private HarvestService service;

    @BeforeEach
    void setUp() {
        StorageProperties properties = new StorageProperties();
        properties.setStoragePath(tempDir.toString());
        service = new HarvestService(new HarvestRepository(properties, new ObjectMapper()));
    }

    @Test
    void getSeason_buildsPlantAndGlobalCumulativeSeries() {
        service.addPlant(2026, "Balcony");
        service.addPlant(2026, "Greenhouse");
        HarvestView initial = service.getSeason(2026);
        String balconyId = initial.plants().stream().filter(plant -> plant.name().equals("Balcony")).findFirst().orElseThrow().id();
        String greenhouseId = initial.plants().stream().filter(plant -> plant.name().equals("Greenhouse")).findFirst().orElseThrow().id();

        service.addHarvest(2026, balconyId, LocalDate.of(2026, 7, 1), 2);
        service.addHarvest(2026, balconyId, LocalDate.of(2026, 7, 1), 3);
        service.addHarvest(2026, greenhouseId, LocalDate.of(2026, 7, 2), 4);

        HarvestView view = service.getSeason(2026);
        assertThat(view.totalQuantity()).isEqualTo(9);
        assertThat(view.plantTotals()).extracting(HarvestView.PlantTotal::totalQuantity).containsExactlyInAnyOrder(2 + 3, 4);
        assertThat(view.globalSeries()).extracting(HarvestView.ChartPoint::quantity).containsExactly(5, 9);
        assertThat(view.plantSeries()).allSatisfy(series -> assertThat(series.points()).isSortedAccordingTo(java.util.Comparator.comparing(HarvestView.ChartPoint::date)));
    }

    @Test
    void addHarvest_rejectsDateOutsideSeasonAndNonPositiveQuantity() {
        service.addPlant(2026, "Balcony");
        String plantId = service.getSeason(2026).plants().getFirst().id();

        assertThatThrownBy(() -> service.addHarvest(2026, plantId, LocalDate.of(2025, 12, 31), 1))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
        assertThatThrownBy(() -> service.addHarvest(2026, plantId, LocalDate.of(2026, 6, 1), 0))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
    }
}
