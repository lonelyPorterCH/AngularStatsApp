package ch.lonelyporter.statsapp.persistence;

import ch.lonelyporter.statsapp.StorageProperties;
import ch.lonelyporter.statsapp.web.model.Statistic;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Path;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

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

    private Statistic createStatisticWithDataset(String id, String title, String xAxis, String yAxis) {
        Statistic statistic = new Statistic();
        statistic.setId(id);
        statistic.setTitle(title);
        statistic.setReverse(false);
        statistic.setXAxisName(xAxis);
        statistic.setYAxisName(yAxis);
        Statistic.Dataset ds = new Statistic.Dataset(yAxis, new ArrayList<>(List.of(
                new Statistic.DataPoint("2024-01-01", "100"),
                new Statistic.DataPoint("2024-01-15", "150"),
                new Statistic.DataPoint("2024-02-01", "130")
        )));
        statistic.setDatasets(new ArrayList<>(List.of(ds)));
        return statistic;
    }

    @Test
    void save_writesJsonFile() {
        Statistic statistic = createStatisticWithDataset("test-chart", "My Chart", "Date", "Price");

        repository.save(statistic);

        Path expectedFile = tempDir.resolve("test-chart.json");
        assertThat(expectedFile).exists();
    }

    @Test
    void save_thenFindById_returnsEquivalentStatistic() {
        Statistic original = createStatisticWithDataset("test-chart", "My Chart", "Date", "Price");

        repository.save(original);
        Statistic loaded = repository.findById("test-chart");

        assertThat(loaded.getId()).isEqualTo("test-chart");
        assertThat(loaded.getXAxisName()).isEqualTo("Date");
        assertThat(loaded.getYAxisName()).isEqualTo("Price");
        assertThat(loaded.getDatasets()).hasSize(1);
        assertThat(loaded.getDatasets().get(0).getDataPoints()).containsExactly(
                new Statistic.DataPoint("2024-01-01", "100"),
                new Statistic.DataPoint("2024-01-15", "150"),
                new Statistic.DataPoint("2024-02-01", "130"));
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
    void findAll_onEmptyFolder_returnsEmptyList() {
        List<Statistic> all = repository.findAll();

        assertThat(all).isEmpty();
    }

    @Test
    void save_sortsDataPointsByDateAscending() {
        Statistic statistic = new Statistic();
        statistic.setId("sorted-chart");
        statistic.setTitle("Sorted Chart");
        statistic.setXAxisName("Date");
        statistic.setYAxisName("Price");
        statistic.setDatasets(new ArrayList<>(List.of(
                new Statistic.Dataset("Price", new ArrayList<>(List.of(
                        new Statistic.DataPoint("2024-02-01", "130"),
                        new Statistic.DataPoint("2024-01-01", "100"),
                        new Statistic.DataPoint("2024-01-15", "150")
                )))
        )));

        repository.save(statistic);
        Statistic loaded = repository.findById("sorted-chart");

        assertThat(loaded.getDatasets().get(0).getDataPoints()).containsExactly(
                new Statistic.DataPoint("2024-01-01", "100"),
                new Statistic.DataPoint("2024-01-15", "150"),
                new Statistic.DataPoint("2024-02-01", "130")
        );
    }

    @Test
    void findById_whenFilledMissing_defaultsToFalse() throws Exception {
        String json = """
                {
                  "id": "legacy-chart",
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
        assertThat(loaded.getDatasets().get(0).isFilled()).isFalse();
    }
}
