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

        service.setDatasetSmoothing("weight", "Series", true);

        Statistic loaded = repository.findById("weight");
        assertThat(loaded.getDatasets().getFirst().isSmoothing()).isTrue();
        assertThat(loaded.getDatasets().getFirst().getDataPoints()).containsExactly(new Statistic.DataPoint("2026-10-30", "64"));
        assertThat(repository.findById("other").getDatasets().getFirst().isSmoothing()).isFalse();

        service.setDatasetSmoothing("weight", "Series", false);
        assertThat(repository.findById("weight").getDatasets().getFirst().isSmoothing()).isFalse();
    }

    @Test
    void smoothingWindowDefaultsToSevenAndPersistsIndependently() throws Exception {
        Files.writeString(tempDir.resolve("legacy.json"), """
                {"id":"legacy","reverse":false,"datasets":[{"label":"Series","dataPoints":[]},{"label":"Other","dataPoints":[]}]}
                """);
        assertThat(repository.findById("legacy").getDatasets().getFirst().getSmoothingWindow()).isEqualTo(7);
        service.setDatasetSmoothingWindow("legacy", "Series", 3);
        Statistic loaded = repository.findById("legacy");
        assertThat(loaded.getDatasets().getFirst().getSmoothingWindow()).isEqualTo(3);
        assertThat(loaded.getDatasets().get(1).getSmoothingWindow()).isEqualTo(7);
        assertThatThrownBy(() -> service.setDatasetSmoothingWindow("legacy", "Series", 0))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
        assertThat(repository.findById("legacy").getDatasets().getFirst().getSmoothingWindow()).isEqualTo(3);
        repository.toggleArchive("legacy");
        assertThatThrownBy(() -> service.setDatasetSmoothingWindow("legacy", "Series", 4))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticConflictException.class);
    }

    @Test
    void effortComparisonAndPacePersistIndependentlyWithoutRewritingMeasurements() {
        Statistic runs = createStatistic("runs", "Runs");
        runs.getDatasets().getFirst().setSmoothing(true);
        runs.getDatasets().getFirst().getDataPoints().addAll(List.of(
                new Statistic.DataPoint("2026-11-01", "4.59"),
                new Statistic.DataPoint("2026-11-02", "5.1")));
        repository.save(runs);
        repository.save(createStatistic("other", "Other"));
        service.setEffortComparison("runs", true);
        service.setYAxisFormat("runs", "pace");
        Statistic loaded = repository.findById("runs");
        assertThat(loaded.isEffortComparison()).isTrue();
        assertThat(loaded.getDatasets().getFirst().isSmoothing()).isTrue();
        assertThat(loaded.getYAxisFormat()).isEqualTo("pace");
        assertThat(loaded.getDatasets().getFirst().getDataPoints()).isEqualTo(runs.getDatasets().getFirst().getDataPoints());
        assertThat(repository.findById("other").isEffortComparison()).isFalse();
        assertThat(repository.findById("other").getYAxisFormat()).isEqualTo("number");
        service.setEffortComparison("runs", false);
        service.setYAxisFormat("runs", "number");
        assertThat(repository.findById("runs").isEffortComparison()).isFalse();
        assertThat(repository.findById("runs").getYAxisFormat()).isEqualTo("number");
    }

    @Test
    void newSettingsDefaultForMissingAndNullPropertiesAndRejectArchivedChanges() throws Exception {
        for (String properties : List.of("", ",\"effortComparison\":null,\"yAxisFormat\":null")) {
            Files.writeString(tempDir.resolve("legacy.json"),
                    "{\"id\":\"legacy\",\"title\":\"Legacy\",\"reverse\":false,\"datasets\":[]" + properties + "}");
            assertThat(repository.findById("legacy").isEffortComparison()).isFalse();
            assertThat(repository.findById("legacy").getYAxisFormat()).isEqualTo("number");
        }
        repository.toggleArchive("legacy");
        assertThatThrownBy(() -> service.setEffortComparison("legacy", true))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticConflictException.class);
        assertThatThrownBy(() -> service.setYAxisFormat("legacy", "pace"))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticConflictException.class);
        assertThat(repository.findById("legacy").isEffortComparison()).isFalse();
        assertThat(repository.findById("legacy").getYAxisFormat()).isEqualTo("number");
    }

    @Test
    void paceValidationRejectsInvalidSettingsAndMeasurementsWithoutSaving() throws Exception {
        Statistic runs = createStatistic("runs", "Runs");
        repository.save(runs);
        String original = Files.readString(tempDir.resolve("runs.json"));
        for (String format : new String[]{null, "duration", ""}) {
            assertThatThrownBy(() -> service.setYAxisFormat("runs", format))
                    .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
            assertThat(Files.readString(tempDir.resolve("runs.json"))).isEqualTo(original);
        }
        service.setYAxisFormat("runs", "pace");
        for (String value : List.of("4.59", "5.1", "5:09", "5:1", "5", "0.00")) {
            service.addDataPoint("runs", "Series", new Statistic.DataPoint("2026-11-01", value));
        }
        String valid = Files.readString(tempDir.resolve("runs.json"));
        for (String value : List.of("5.60", "5:60", "5.123", "-1", "NaN", "invalid")) {
            assertThatThrownBy(() -> service.addDataPoint("runs", "Series", new Statistic.DataPoint("2026-11-02", value)))
                    .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
            assertThat(Files.readString(tempDir.resolve("runs.json"))).isEqualTo(valid);
        }
        Statistic invalid = createStatistic("invalid", "Invalid");
        invalid.getDatasets().getFirst().getDataPoints().add(new Statistic.DataPoint("2026-11-01", "5.99"));
        repository.save(invalid);
        assertThatThrownBy(() -> service.setYAxisFormat("invalid", "pace"))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
        assertThat(repository.findById("invalid").getYAxisFormat()).isEqualTo("number");
        invalid.setYAxisFormat("pace");
        invalid.setId("new-invalid");
        assertThatThrownBy(() -> service.createStatistic(invalid))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
        assertThat(tempDir.resolve("new-invalid.json")).doesNotExist();
    }

    @Test
    void setSmoothingRejectsArchivedGraphs() {
        repository.save(createStatistic("weight", "Weight"));
        repository.toggleArchive("weight");

        assertThatThrownBy(() -> service.setDatasetSmoothing("weight", "Series", true))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticConflictException.class);
        assertThat(repository.findById("weight").getDatasets().getFirst().isSmoothing()).isFalse();
    }

    @Test
    void missingSmoothingPropertyDefaultsToOff() throws Exception {
        Files.writeString(tempDir.resolve("legacy.json"), """
                {"id":"legacy","title":"Legacy","reverse":false,"datasets":[{"label":"Series"}]}
                """);
        assertThat(repository.findById("legacy").getDatasets().getFirst().isSmoothing()).isFalse();
    }

    @Test
    void renameStatisticChangesOnlyTheTitleAndTrimsWhitespace() {
        Statistic statistic = createStatistic("weight", "weight");
        statistic.getDatasets().getFirst().setSmoothing(true);
        statistic.getDatasets().getFirst().getDataPoints().add(new Statistic.DataPoint("2026-10-30", "64"));
        repository.save(statistic);

        service.renameStatistic("weight", "  Weight  ");

        Statistic loaded = repository.findById("weight");
        assertThat(loaded.getTitle()).isEqualTo("Weight");
        assertThat(loaded.getId()).isEqualTo("weight");
        assertThat(loaded.getDatasets().getFirst().isSmoothing()).isTrue();
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
    void stackingPersistsAcrossReloadAndDatasetChangesWithoutChangingMeasurement() {
        Statistic statistic = createStatistic("cumulus", "Cumulus");
        statistic.getDatasets().getFirst().getDataPoints().add(new Statistic.DataPoint("2026-09-30", "1000"));
        statistic.getDatasets().getFirst().setSmoothing(true);
        repository.save(statistic);
        service.addDataset("cumulus", "Carry");
        service.addDataPoint("cumulus", "Carry", new Statistic.DataPoint("2026-09-30", "391"));

        service.setStacked("cumulus", true);
        Statistic loaded = service.getStatisticById("cumulus");
        assertThat(loaded.isStacked()).isTrue();
        assertThat(loaded.getDatasets().getFirst().isSmoothing()).isTrue();
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
    void yAxisBoundsPersistIndependentlyAndCanBeClearedWithoutChangingOtherSettings() throws Exception {
        Statistic statistic = createStatistic("chart", "Chart");
        statistic.setReverse(true);
        statistic.getDatasets().getFirst().setSmoothing(true);
        statistic.getDatasets().getFirst().getDataPoints().add(new Statistic.DataPoint("2026-11-02", "-50"));
        repository.save(statistic);
        repository.save(createStatistic("other", "Other"));

        service.setYAxisBounds("chart", -100.5, 0.0);
        Statistic loaded = service.getStatisticById("chart");
        assertThat(loaded.getYAxisMin()).isEqualTo(-100.5);
        assertThat(loaded.getYAxisMax()).isEqualTo(0.0);
        assertThat(Files.readString(tempDir.resolve("chart.json")))
                .contains("\"yAxisMin\"", "\"yAxisMax\"");
        assertThat(loaded.isReverse()).isTrue();
        assertThat(loaded.getDatasets().getFirst().isSmoothing()).isTrue();
        assertThat(loaded.getDatasets().getFirst().getDataPoints())
                .containsExactly(new Statistic.DataPoint("2026-11-02", "-50"));
        assertThat(repository.findById("other").getYAxisMin()).isNull();
        assertThat(repository.findById("other").getYAxisMax()).isNull();

        service.setYAxisBounds("chart", null, -5.0);
        assertThat(repository.findById("chart").getYAxisMin()).isNull();
        assertThat(repository.findById("chart").getYAxisMax()).isEqualTo(-5.0);
        service.setYAxisBounds("chart", 0.0, null);
        assertThat(repository.findById("chart").getYAxisMin()).isEqualTo(0.0);
        assertThat(repository.findById("chart").getYAxisMax()).isNull();
        service.setYAxisBounds("chart", null, null);
        assertThat(repository.findById("chart").getYAxisMin()).isNull();
        assertThat(repository.findById("chart").getYAxisMax()).isNull();
    }

    @Test
    void yAxisBoundsValidateCreationAndUpdatesBeforeSaving() {
        Statistic statistic = createStatistic("chart", "Chart");
        statistic.setYAxisMin(-10.0);
        statistic.setYAxisMax(10.0);
        service.createStatistic(statistic);
        assertThat(repository.findById("chart").getYAxisMin()).isEqualTo(-10.0);
        assertThat(repository.findById("chart").getYAxisMax()).isEqualTo(10.0);
        for (Double[] bounds : new Double[][]{
                {5.0, 5.0}, {10.0, 5.0}, {Double.NaN, null},
                {null, Double.POSITIVE_INFINITY}, {Double.NEGATIVE_INFINITY, 0.0}}) {
            assertThatThrownBy(() -> service.setYAxisBounds("chart", bounds[0], bounds[1]))
                    .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
            Statistic invalid = createStatistic("invalid", "Invalid");
            invalid.setYAxisMin(bounds[0]);
            invalid.setYAxisMax(bounds[1]);
            assertThatThrownBy(() -> service.createStatistic(invalid))
                    .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
            assertThat(repository.findById("chart").getYAxisMin()).isEqualTo(-10.0);
            assertThat(repository.findById("chart").getYAxisMax()).isEqualTo(10.0);
            assertThatThrownBy(() -> repository.findById("invalid"))
                    .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticNotFoundException.class);
        }
    }

    @Test
    void yAxisBoundsRejectArchivedAndMissingChartsAndLegacyFilesHaveNoBounds() throws Exception {
        Files.writeString(tempDir.resolve("legacy.json"),
                "{\"id\":\"legacy\",\"reverse\":false,\"datasets\":[]}");
        assertThat(repository.findById("legacy").getYAxisMin()).isNull();
        assertThat(repository.findById("legacy").getYAxisMax()).isNull();
        repository.toggleArchive("legacy");
        assertThatThrownBy(() -> service.setYAxisBounds("legacy", 0.0, 100.0))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticConflictException.class);
        assertThat(repository.findById("legacy").getYAxisMin()).isNull();
        assertThatThrownBy(() -> service.setYAxisBounds("missing", null, null))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticNotFoundException.class);
    }

    @Test
    void yAxisBoundsAcceptJsonNumbersAndNullUsingTheApiPropertyNames() throws Exception {
        ObjectMapper mapper = new ObjectMapper();
        Statistic statistic = mapper.readValue(
                "{\"id\":\"chart\",\"reverse\":false,\"yAxisMin\":-10.5,\"yAxisMax\":100,\"datasets\":[]}",
                Statistic.class);
        service.createStatistic(statistic);
        assertThat(repository.findById("chart").getYAxisMin()).isEqualTo(-10.5);
        assertThat(repository.findById("chart").getYAxisMax()).isEqualTo(100.0);
        Statistic automatic = mapper.readValue(
                "{\"id\":\"automatic\",\"reverse\":false,\"yAxisMin\":null,\"yAxisMax\":null,\"datasets\":[]}",
                Statistic.class);
        service.createStatistic(automatic);
        assertThat(repository.findById("automatic").getYAxisMin()).isNull();
        assertThat(repository.findById("automatic").getYAxisMax()).isNull();
    }

        @Test
        void chartTypePersistsWithoutChangingMeasurementsOrLineSettings() {
        Statistic statistic = createStatistic("chart", "Chart");
        statistic.getDatasets().getFirst().setSmoothing(true);
        statistic.getDatasets().getFirst().getDataPoints().add(new Statistic.DataPoint("2026-11-03", "300"));
        service.createStatistic(statistic);
        for (String chartType : List.of("bar", "line")) {
            service.setChartType("chart", chartType);
            Statistic loaded = service.getStatisticById("chart");
            assertThat(loaded.getChartType()).isEqualTo(chartType);
            assertThat(loaded.getDatasets().getFirst().isSmoothing()).isTrue();
            assertThat(loaded.getDatasets().getFirst().getDataPoints())
                .containsExactly(new Statistic.DataPoint("2026-11-03", "300"));
        }
        statistic.setId("bar-chart");
        statistic.setChartType("bar");
        service.createStatistic(statistic);
        assertThat(repository.findById("bar-chart").getChartType()).isEqualTo("bar");
        }

        @Test
        void chartTypeRejectsInvalidSettingsArchivedAndMissingGraphs() {
        repository.save(createStatistic("chart", "Chart"));
        for (String chartType : new String[]{null, "", "pie", "BAR"}) {
            assertThatThrownBy(() -> service.setChartType("chart", chartType))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
        }
        Statistic invalid = createStatistic("invalid", "Invalid");
        invalid.setChartType("pie");
        assertThatThrownBy(() -> service.createStatistic(invalid))
            .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
        assertThat(repository.findAll()).hasSize(1);
        repository.toggleArchive("chart");
        assertThatThrownBy(() -> service.setChartType("chart", "bar"))
            .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticConflictException.class);
        assertThat(repository.findById("chart").getChartType()).isEqualTo("line");
        assertThatThrownBy(() -> service.setChartType("missing", "bar"))
            .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticNotFoundException.class);
        }

            @Test
            void barChartsRejectDuplicateXValuesWithoutDiscardingExistingMeasurements() {
            for (String xAxisScaleType : List.of("time", "linear")) {
                String firstX = "linear".equals(xAxisScaleType) ? "2" : "2026-11-03";
                String duplicateX = "linear".equals(xAxisScaleType) ? "02.0" : firstX;
                Statistic statistic = createStatistic(xAxisScaleType, "Chart");
                statistic.setXAxisScaleType(xAxisScaleType);
                statistic.getDatasets().getFirst().getDataPoints().add(new Statistic.DataPoint(firstX, "100"));
                statistic.getDatasets().getFirst().getDataPoints().add(new Statistic.DataPoint(duplicateX, "200"));
                service.createStatistic(statistic);
                assertThatThrownBy(() -> service.setChartType(xAxisScaleType, "bar"))
                    .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class)
                    .hasMessageContaining("Edit the existing point");
                assertThat(repository.findById(xAxisScaleType).getChartType()).isEqualTo("line");
                assertThat(repository.findById(xAxisScaleType).getDatasets().getFirst().getDataPoints()).hasSize(2);
                statistic.setId(xAxisScaleType + "-bar");
                statistic.setChartType("bar");
                assertThatThrownBy(() -> service.createStatistic(statistic))
                    .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
                statistic.getDatasets().getFirst().getDataPoints().removeLast();
                service.createStatistic(statistic);
                assertThatThrownBy(() -> service.addDataPoint(statistic.getId(), "Series", new Statistic.DataPoint(duplicateX, "300")))
                    .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
                assertThat(repository.findById(statistic.getId()).getDatasets().getFirst().getDataPoints())
                    .containsExactly(new Statistic.DataPoint(firstX, "100"));
            }
            }

        @Test
        void changingBarAxisScaleRejectsValuesThatWouldCollapseToTheSameX() {
            Statistic statistic = createStatistic("chart", "Chart");
            statistic.setChartType("bar");
            statistic.getDatasets().getFirst().getDataPoints().addAll(List.of(
                    new Statistic.DataPoint("2", "100"), new Statistic.DataPoint("02.0", "200")));
            service.createStatistic(statistic);
            assertThatThrownBy(() -> service.renameAxes("chart", "X", "Y", "linear", ""))
                    .isInstanceOf(ch.lonelyporter.statsapp.exception.InvalidDataPointException.class);
            assertThat(repository.findById("chart").getXAxisScaleType()).isEqualTo("time");
            assertThat(repository.findById("chart").getDatasets().getFirst().getDataPoints()).hasSize(2);
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
