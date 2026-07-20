package ch.lonelyporter.statsapp.persistence;

import ch.lonelyporter.statsapp.StorageProperties;
import ch.lonelyporter.statsapp.web.model.Statistic;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StatisticRepositoryTest {

    @TempDir
    Path tempDir;

    private StatisticRepository repository;

    @BeforeEach
    void setUp() {
        StorageProperties props = new StorageProperties();
        props.setStoragePath(tempDir.toString());
        repository = new StatisticRepository(props, new ObjectMapper());
    }

    private static Statistic createStatisticWithUnsortedDataset() {
        Statistic statistic = new Statistic();
        statistic.setId("test-chart");
        statistic.setTitle("My Chart");
        statistic.setReverse(false);
        statistic.setXAxisName("Date");
        statistic.setYAxisName("Price");
        statistic.setDatasets(new ArrayList<>(List.of(
                new Statistic.Dataset("Price", new ArrayList<>(List.of(
                        new Statistic.DataPoint("2024-02-01", "130"),
                        new Statistic.DataPoint("2024-01-01", "100"),
                        new Statistic.DataPoint("2024-01-15", "150")
                )))
        )));
        return statistic;
    }

    @Test
    void save_writesJsonFile() {
        Statistic statistic = createStatisticWithUnsortedDataset();

        repository.save(statistic);

        Path expectedFile = tempDir.resolve("test-chart.json");
        assertThat(expectedFile).exists();
    }

    @Test
    void save_thenFindById_returnsEquivalentStatistic() {
        Statistic original = createStatisticWithUnsortedDataset();

        repository.save(original);
        Statistic loaded = repository.findById("test-chart");

        assertThat(loaded.getId()).isEqualTo("test-chart");
        assertThat(loaded.getXAxisName()).isEqualTo("Date");
        assertThat(loaded.getYAxisName()).isEqualTo("Price");
        assertThat(loaded.getDatasets()).hasSize(1);
        assertThat(loaded.getDatasets().getFirst().getDataPoints()).containsExactly(
                new Statistic.DataPoint("2024-01-01", "100"),
                new Statistic.DataPoint("2024-01-15", "150"),
                new Statistic.DataPoint("2024-02-01", "130"));
    }

    @Test
    void toggleArchive_movesStatisticBetweenFolders() {
        Statistic statistic = createStatisticWithUnsortedDataset();

        repository.save(statistic);
        repository.toggleArchive("test-chart");

        assertThat(tempDir.resolve("test-chart.json")).doesNotExist();
        assertThat(tempDir.resolve("archived/test-chart.json")).exists();
        assertThat(repository.isArchived("test-chart")).isTrue();

        repository.toggleArchive("test-chart");

        assertThat(tempDir.resolve("test-chart.json")).exists();
        assertThat(tempDir.resolve("archived/test-chart.json")).doesNotExist();
        assertThat(repository.isArchived("test-chart")).isFalse();
    }

    @Test
    void findAll_returnsAllSavedStatistics() {
        Statistic s1 = new Statistic();
        s1.setId("chart-1");
        s1.setTitle("Chart 1");
        s1.setXAxisName("Date");
        s1.setYAxisName("Price");
        s1.setDatasets(new ArrayList<>(List.of(new Statistic.Dataset("Price", new ArrayList<>(List.of(new Statistic.DataPoint("2024-01-01", "100")))))));
        Statistic s2 = new Statistic();
        s2.setId("chart-2");
        s2.setTitle("Chart 2");
        s2.setXAxisName("Date");
        s2.setYAxisName("Volume");
        s2.setDatasets(new ArrayList<>(List.of(new Statistic.Dataset("Volume", new ArrayList<>(List.of(new Statistic.DataPoint("2024-01-01", "200")))))));
        repository.save(s1);
        repository.save(s2);

        List<Statistic> all = repository.findAll();

        assertThat(all).hasSize(2);
        assertThat(all).extracting(Statistic::getId)
                .containsExactlyInAnyOrder("chart-1", "chart-2");
    }

    @Test
    void findAllArchived_returnsOnlyArchivedStatistics() {
        Statistic active = new Statistic();
        active.setId("chart-1");
        active.setTitle("Chart 1");
        active.setXAxisName("Date");
        active.setYAxisName("Price");
        active.setDatasets(new ArrayList<>(List.of(new Statistic.Dataset("Price", new ArrayList<>(List.of(new Statistic.DataPoint("2024-01-01", "100")))))));

        Statistic archived = new Statistic();
        archived.setId("chart-2");
        archived.setTitle("Chart 2");
        archived.setXAxisName("Date");
        archived.setYAxisName("Volume");
        archived.setDatasets(new ArrayList<>(List.of(new Statistic.Dataset("Volume", new ArrayList<>(List.of(new Statistic.DataPoint("2024-01-01", "200")))))));

        repository.save(active);
        repository.save(archived);
        repository.toggleArchive("chart-2");

        List<Statistic> archivedStats = repository.findAllArchived();

        assertThat(archivedStats).hasSize(1);
        assertThat(archivedStats.getFirst().getId()).isEqualTo("chart-2");
    }

    @Test
    void findAll_onEmptyFolder_returnsEmptyList() {
        List<Statistic> all = repository.findAll();

        assertThat(all).isEmpty();
    }

    @Test
    void save_sortsDataPointsByDateAscending() {
        Statistic statistic = createStatisticWithUnsortedDataset();

        repository.save(statistic);
        Statistic loaded = repository.findById("test-chart");

        assertThat(loaded.getDatasets().getFirst().getDataPoints()).containsExactly(
                new Statistic.DataPoint("2024-01-01", "100"),
                new Statistic.DataPoint("2024-01-15", "150"),
                new Statistic.DataPoint("2024-02-01", "130")
        );
    }

    @Test
    void findById_whenFilledMissing_defaultsToFalse() throws Exception {
        String json = """
                {
                  "id": "legacy-scale-chart",
                  "title": "Legacy Chart",
                  "reverse": false,
                  "xAxisName": "Date",
                  "yAxisName": "Price",
                  "datasets": [
                    {
                      "label": "Price",
                      "index": 0,
                      "dataPoints": [
                        {"x": "2024-01-01", "y": "100"}
                      ]
                    }
                  ]
                }
                """;
        Files.writeString(tempDir.resolve("legacy-chart.json"), json);

        Statistic loaded = repository.findById("legacy-chart");

        assertThat(loaded.getDatasets()).hasSize(1);
        assertThat(loaded.getDatasets().getFirst().isFilled()).isFalse();
    }

    @Test
    void findById_whenXAxisScaleMissing_defaultsToTime() throws Exception {
        String json = """
                {
                                    "id": "legacy-scale-chart",
                  "title": "Legacy Chart",
                                      "reverse": false,
                  "xAxisName": "Date",
                  "yAxisName": "Value",
                  "datasets": []
                }
                """;
        Files.writeString(tempDir.resolve("legacy-scale-chart.json"), json);

        Statistic loaded = repository.findById("legacy-scale-chart");

        assertThat(loaded.getXAxisScaleType()).isEqualTo("time");
    }

    @Test
    void save_linearChart_sortsDataPointsNumerically() {
        Statistic statistic = createStatisticWithUnsortedDataset();
        statistic.setXAxisScaleType("linear");
        statistic.getDatasets().getFirst().getDataPoints().clear();
        statistic.getDatasets().getFirst().getDataPoints().addAll(List.of(
                new Statistic.DataPoint("10", "1000"),
                new Statistic.DataPoint("2", "200"),
                new Statistic.DataPoint("0.5", "50")
        ));

        repository.save(statistic);

        assertThat(repository.findById("test-chart").getDatasets().getFirst().getDataPoints())
                .extracting(Statistic.DataPoint::getX)
                .containsExactly("0.5", "2", "10");
    }

    @Test
    void save_whenIdIsReserved_throwsConflict() {
        Statistic statistic = createStatisticWithUnsortedDataset();
        statistic.setId("archived");

        assertThatThrownBy(() -> repository.save(statistic))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticConflictException.class);
    }
}
