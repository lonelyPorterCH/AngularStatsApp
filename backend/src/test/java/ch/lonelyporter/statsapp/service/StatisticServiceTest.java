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
    void createStatisticPreservesImportedDatasetsAndRejectsDuplicateCreation() {
        Statistic statistic = createStatistic("body", "Body measurements");
        Statistic.Dataset weight = new Statistic.Dataset("Weight (kg)", new ArrayList<>(List.of(
                new Statistic.DataPoint("2026-10-30", "64"))));
        Statistic.Dataset fat = new Statistic.Dataset("Fat mass (kg)", new ArrayList<>(List.of(
                new Statistic.DataPoint("2026-10-30", "8.8"))));
        fat.setIndex(1);
        statistic.setDatasets(new ArrayList<>(List.of(weight, fat)));
        service.createStatistic(statistic);

        Statistic loaded = repository.findById("body");
        assertThat(loaded.getDatasets()).hasSize(2);
        assertThat(loaded.getDatasets().get(1).getDataPoints().getFirst().getY()).isEqualTo("8.8");
        assertThatThrownBy(() -> service.createStatistic(statistic))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticConflictException.class);
    }

    @Test
    void createStatisticAssignsNextIndex() {
        Statistic first = createStatistic("chart-1", "Chart 1");
        first.setIndex(0);
        repository.save(first);

        Statistic second = createStatistic("chart-2", "Chart 2");
        service.createStatistic(second);

        Statistic loaded = repository.findById("chart-2");
        assertThat(loaded.getIndex()).isEqualTo(1);
    }

    @Test
    void getStatisticsAssignsMissingIndexAndPersistsIt() throws Exception {
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
    void getArchivedStatisticsReturnsArchivedStatistics() {
        Statistic archived = createStatistic("archived-chart", "Archived Chart");
        repository.save(archived);
        repository.toggleArchive("archived-chart");

        List<Statistic> archivedStats = service.getArchivedStatistics();

        assertThat(archivedStats).hasSize(1);
        assertThat(archivedStats.getFirst().getId()).isEqualTo("archived-chart");
    }

    @Test
    void toggleArchiveMovesStatisticBetweenFolders() {
        Statistic statistic = createStatistic("chart-1", "Chart 1");
        repository.save(statistic);

        service.toggleArchive("chart-1");

        assertThat(repository.isArchived("chart-1")).isTrue();
    }

    @Test
    void addDataPointRejectsNegativeLinearXAxisValue() {
        Statistic statistic = createStatistic("linear-chart", "Linear Chart");
        statistic.setXAxisScaleType("linear");
        repository.save(statistic);

        assertThatThrownBy(() -> service.addDataPoint(
                "linear-chart", "Series", new Statistic.DataPoint("-1", "100")))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
    }

    @Test
    void datasetMutationsRejectUnknownLabelsWithoutSaving() throws Exception {
        repository.save(createStatistic("chart", "Chart"));
        Path statisticFile = tempDir.resolve("chart.json");
        String originalJson = Files.readString(statisticFile);
        Statistic.DataPoint point = new Statistic.DataPoint("2026-10-30", "1");
        List<Runnable> mutations = List.of(
                () -> service.deleteDataset("chart", "Missing"),
                () -> service.renameDataset("chart", "Missing", "Renamed"),
                () -> service.setDatasetFilled("chart", "Missing", true),
                () -> service.setDatasetColor("chart", "Missing", "#ffffff"),
                () -> service.addDataPoint("chart", "Missing", point),
                () -> service.deleteDataPoint("chart", "Missing", point),
                () -> service.reorderDatasets("chart", List.of("Missing"))
        );

        for (Runnable mutation : mutations) {
            assertThatThrownBy(mutation::run)
                    .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticNotFoundException.class)
                    .hasMessageContaining("Missing");
            assertThat(Files.readString(statisticFile)).isEqualTo(originalJson);
        }
    }

    @Test
    void setSmoothingPersistsPerGraphWithoutChangingMeasurements() {
        Statistic weight = createStatistic("weight", "Weight");
        weight.getDatasets().getFirst().getDataPoints().add(new Statistic.DataPoint("2026-10-30", "64"));
        repository.save(weight);
        repository.save(createStatistic("other", "Other"));

        service.setSmoothing("weight", true);

        Statistic loaded = repository.findById("weight");
        assertThat(loaded.isSmoothing()).isTrue();
        assertThat(loaded.getDatasets().getFirst().getDataPoints()).containsExactly(new Statistic.DataPoint("2026-10-30", "64"));
        assertThat(repository.findById("other").isSmoothing()).isFalse();

        service.setSmoothing("weight", false);
        assertThat(repository.findById("weight").isSmoothing()).isFalse();
    }

    @Test
    void setSmoothingRejectsArchivedGraphs() {
        repository.save(createStatistic("weight", "Weight"));
        repository.toggleArchive("weight");

        assertThatThrownBy(() -> service.setSmoothing("weight", true))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticConflictException.class);
        assertThat(repository.findById("weight").isSmoothing()).isFalse();
    }

    @Test
    void missingSmoothingPropertyDefaultsToOff() throws Exception {
        Files.writeString(tempDir.resolve("legacy.json"), """
                {"id":"legacy","title":"Legacy","reverse":false,"datasets":[]}
                """);
        assertThat(repository.findById("legacy").isSmoothing()).isFalse();
    }

    @Test
    void renameStatisticChangesOnlyTheTitleAndTrimsWhitespace() {
        Statistic statistic = createStatistic("weight", "weight");
        statistic.setSmoothing(true);
        statistic.getDatasets().getFirst().getDataPoints().add(new Statistic.DataPoint("2026-10-30", "64"));
        repository.save(statistic);

        service.renameStatistic("weight", "  Weight  ");

        Statistic loaded = repository.findById("weight");
        assertThat(loaded.getTitle()).isEqualTo("Weight");
        assertThat(loaded.getId()).isEqualTo("weight");
        assertThat(loaded.isSmoothing()).isTrue();
        assertThat(loaded.getXAxisName()).isEqualTo("Date");
        assertThat(loaded.getDatasets().getFirst().getLabel()).isEqualTo("Series");
        assertThat(loaded.getDatasets().getFirst().getDataPoints()).containsExactly(new Statistic.DataPoint("2026-10-30", "64"));
    }

    @Test
    void renameStatisticRejectsBlankTitlesAndArchivedGraphs() {
        repository.save(createStatistic("weight", "weight"));
        for (String title : List.of("", "   ", "\t\n")) {
            assertThatThrownBy(() -> service.renameStatistic("weight", title))
                    .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
        }
        assertThatThrownBy(() -> service.renameStatistic("weight", null))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
        assertThat(repository.findById("weight").getTitle()).isEqualTo("weight");

        repository.toggleArchive("weight");
        assertThatThrownBy(() -> service.renameStatistic("weight", "Weight"))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticConflictException.class);
        assertThat(repository.findById("weight").getTitle()).isEqualTo("weight");
    }

    @Test
    void renameAxesTrimsAndPersistsXAxisUnit() {
        Statistic statistic = createStatistic("linear-chart", "Linear Chart");
        repository.save(statistic);

        service.renameAxes("linear-chart", "Distance", "Elevation", "linear", " km ");

        assertThat(repository.findById("linear-chart").getXAxisUnit()).isEqualTo("km");
    }

    @Test
    void stackingPersistsAcrossReloadAndDatasetChangesWithoutChangingMeasurements() {
        Statistic statistic = createStatistic("cumulus", "Cumulus");
        statistic.getDatasets().getFirst().getDataPoints().add(new Statistic.DataPoint("2026-09-30", "1000"));
        statistic.setSmoothing(true);
        repository.save(statistic);
        service.addDataset("cumulus", "Carry");
        service.addDataPoint("cumulus", "Carry", new Statistic.DataPoint("2026-09-30", "391"));

        service.setStacked("cumulus", true);
        Statistic loaded = service.getStatisticById("cumulus");
        assertThat(loaded.isStacked()).isTrue();
        assertThat(loaded.isSmoothing()).isTrue();
        assertThat(loaded.getDatasets().getFirst().getDataPoints())
                .containsExactly(new Statistic.DataPoint("2026-09-30", "1000"));
        assertThat(loaded.getDatasets().get(1).getDataPoints())
                .containsExactly(new Statistic.DataPoint("2026-09-30", "391"));

        service.deleteDataset("cumulus", "Carry");
        assertThat(repository.findById("cumulus").isStacked()).isTrue();
        service.setStacked("cumulus", false);
        assertThat(repository.findById("cumulus").isStacked()).isFalse();
    }

    @Test
    void stackingRejectsTooFewDatasetsAndArchivedGraphs() {
        repository.save(createStatistic("cumulus", "Cumulus"));
        assertThatThrownBy(() -> service.setStacked("cumulus", true))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
        assertThat(repository.findById("cumulus").isStacked()).isFalse();
        service.addDataset("cumulus", "Carry");
        repository.toggleArchive("cumulus");
        assertThatThrownBy(() -> service.setStacked("cumulus", true))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticConflictException.class);
        assertThat(repository.findById("cumulus").isStacked()).isFalse();
    }

    @Test
    void newChartsCanSelectStackingBeforeAddingDatasetsAndLegacyChartsDefaultToOff() throws Exception {
        Statistic statistic = createStatistic("new-chart", "New chart");
        statistic.setDatasets(new ArrayList<>());
        statistic.setStacked(true);
        service.createStatistic(statistic);
        assertThat(repository.findById("new-chart").isStacked()).isTrue();
        for (String property : List.of("", ",\"stacked\":null")) {
            Files.writeString(tempDir.resolve("legacy.json"), "{\"id\":\"legacy\",\"reverse\":false,\"datasets\":[]" + property + "}");
            assertThat(repository.findById("legacy").isStacked()).isFalse();
        }
    }

    @Test
    void includeZeroPersistsIndependentlyPerChartWithoutChangingDataOrOtherSettings() {
        Statistic statistic = createStatistic("chart", "Chart");
        statistic.setReverse(true);
        statistic.setSmoothing(true);
        statistic.getDatasets().getFirst().getDataPoints().add(new Statistic.DataPoint("2026-11-02", "-50"));
        repository.save(statistic);
        repository.save(createStatistic("other", "Other"));

        service.setIncludeZero("chart", true);

        Statistic loaded = service.getStatisticById("chart");
        assertThat(loaded.isIncludeZero()).isTrue();
        assertThat(loaded.isReverse()).isTrue();
        assertThat(loaded.isSmoothing()).isTrue();
        assertThat(loaded.isStacked()).isFalse();
        assertThat(loaded.getDatasets().getFirst().getDataPoints())
                .containsExactly(new Statistic.DataPoint("2026-11-02", "-50"));
        assertThat(repository.findById("other").isIncludeZero()).isFalse();
        service.setIncludeZero("chart", false);
        assertThat(repository.findById("chart").isIncludeZero()).isFalse();
    }

    @Test
    void includeZeroRejectsArchivedAndMissingCharts() {
        repository.save(createStatistic("chart", "Chart"));
        repository.toggleArchive("chart");
        assertThatThrownBy(() -> service.setIncludeZero("chart", true))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticConflictException.class);
        assertThat(repository.findById("chart").isIncludeZero()).isFalse();
        assertThatThrownBy(() -> service.setIncludeZero("missing", true))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticNotFoundException.class);
    }

    @Test
    void includeZeroCanBeSelectedAtCreationAndMissingOrNullDefaultsToOff() throws Exception {
        Statistic statistic = createStatistic("chart", "Chart");
        statistic.setIncludeZero(true);
        service.createStatistic(statistic);
        assertThat(repository.findById("chart").isIncludeZero()).isTrue();
        for (String property : List.of("", ",\"includeZero\":null")) {
            Files.writeString(tempDir.resolve("legacy.json"), "{\"id\":\"legacy\",\"reverse\":false,\"datasets\":[]" + property + "}");
            assertThat(repository.findById("legacy").isIncludeZero()).isFalse();
        }
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
