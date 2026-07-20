package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.StorageProperties;
import ch.lonelyporter.statsapp.persistence.StatisticRepository;
import ch.lonelyporter.statsapp.web.model.Statistic;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StatisticServiceTest {

    @TempDir
    Path tempDir;

    private StatisticRepository repository;
    private StatisticService service;

    @BeforeEach
    void setUp() {
        StorageProperties props = new StorageProperties();
        props.setStoragePath(tempDir.toString());
        repository = new StatisticRepository(props, new ObjectMapper());
        service = new StatisticService(repository);
    }

    @Test
    void createStatistic_assignsNextIndex() {
        Statistic first = createStatistic("chart-1", "Chart 1");
        first.setIndex(0);
        repository.save(first);

        Statistic second = createStatistic("chart-2", "Chart 2");
        service.createStatistic(second);

        Statistic loaded = repository.findById("chart-2");
        assertThat(loaded.getIndex()).isEqualTo(1);
    }

    @Test
    void getStatistics_assignsMissingIndexAndPersistsIt() throws Exception {
        String legacyJsonWithoutIndex = """
                {
                  "id": "legacy-chart",
                  "title": "Legacy Chart",
                  "reverse": false,
                  "xAxisName": "Date",
                  "yAxisName": "Price",
                  "datasets": []
                }
                """;
        Files.writeString(tempDir.resolve("legacy-chart.json"), legacyJsonWithoutIndex);

        Statistic indexed = createStatistic("indexed-chart", "Indexed Chart");
        indexed.setIndex(0);
        repository.save(indexed);

        List<Statistic> stats = service.getStatistics();

        assertThat(stats)
                .extracting(Statistic::getIndex)
                .isSortedAccordingTo(Comparator.nullsLast(Integer::compareTo));
        Statistic legacy = stats.stream()
                .filter(stat -> "legacy-chart".equals(stat.getId()))
                .findFirst()
                .orElseThrow();
        assertThat(legacy.getIndex()).isNotNull();
        assertThat(repository.findById("legacy-chart").getIndex()).isEqualTo(legacy.getIndex());
    }

    @Test
    void getArchivedStatistics_returnsArchivedStatistics() {
        Statistic archived = createStatistic("archived-chart", "Archived Chart");
        repository.save(archived);
        repository.toggleArchive("archived-chart");

        List<Statistic> archivedStats = service.getArchivedStatistics();

        assertThat(archivedStats).hasSize(1);
        assertThat(archivedStats.getFirst().getId()).isEqualTo("archived-chart");
    }

    @Test
    void toggleArchive_movesStatisticBetweenFolders() {
        Statistic statistic = createStatistic("chart-1", "Chart 1");
        repository.save(statistic);

        service.toggleArchive("chart-1");

        assertThat(repository.isArchived("chart-1")).isTrue();
    }

    @Test
    void addDataPoint_rejectsNegativeLinearXAxisValue() {
        Statistic statistic = createStatistic("linear-chart", "Linear Chart");
        statistic.setXAxisScaleType("linear");
        repository.save(statistic);

        assertThatThrownBy(() -> service.addDataPoint(
                "linear-chart", "Series", new Statistic.DataPoint("-1", "100")))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
    }

    @Test
    void renameAxes_trimsAndPersistsXAxisUnit() {
        Statistic statistic = createStatistic("linear-chart", "Linear Chart");
        repository.save(statistic);

        service.renameAxes("linear-chart", "Distance", "Elevation", "linear", " km ");

        assertThat(repository.findById("linear-chart").getXAxisUnit()).isEqualTo("km");
    }

    private static Statistic createStatistic(String id, String title) {
        Statistic statistic = new Statistic();
        statistic.setId(id);
        statistic.setTitle(title);
        statistic.setReverse(false);
        statistic.setXAxisName("Date");
        statistic.setYAxisName("Value");
        statistic.setDatasets(new ArrayList<>(List.of(new Statistic.Dataset("Series", new ArrayList<>()))));
        return statistic;
    }
}
