package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.StorageProperties;
import ch.lonelyporter.statsapp.exception.InvalidDataPointException;
import ch.lonelyporter.statsapp.persistence.LayoutRepository;
import ch.lonelyporter.statsapp.persistence.StatisticRepository;
import ch.lonelyporter.statsapp.web.model.DashboardLayout;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import tools.jackson.databind.ObjectMapper;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class LayoutServiceTest {
    @TempDir
    Path directory;
    private LayoutService service;
    private StatisticRepository statistics;

    @BeforeEach
    void setUp() {
        StorageProperties properties = new StorageProperties();
        properties.setStoragePath(directory.toString());
        ObjectMapper mapper = new ObjectMapper();
        service = new LayoutService(new LayoutRepository(properties, mapper));
        statistics = new StatisticRepository(properties, mapper);
    }

    @Test
    void savesAndLoadsGroupsAndPlacementsWithoutListingLayoutAsStatistic() {
        DashboardLayout layout = layout(List.of(
                new DashboardLayout.Chart("tall", 0, 0, 6, 8),
                new DashboardLayout.Chart("top", 6, 0, 6, 4),
                new DashboardLayout.Chart("bottom", 6, 4, 6, 4)));
        service.save(layout);

        assertThat(service.load()).isEqualTo(layout);
        assertThat(directory.resolve("layout.json")).exists();
        assertThat(statistics.findAll()).isEmpty();
        assertThatThrownBy(() -> statistics.deleteById("layout"))
                .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticConflictException.class);
        assertThat(directory.resolve("layout.json")).exists();
    }

    @Test
    void rejectsOverlapsOutOfBoundsAndDuplicateChartsWithoutOverwritingSavedLayout() {
        DashboardLayout original = service.load();
        service.save(original);
        DashboardLayout.Chart first = new DashboardLayout.Chart("one", 0, 0, 6, 4);
        List<DashboardLayout> invalid = List.of(
                layout(List.of(first, new DashboardLayout.Chart("two", 5, 3, 6, 4))),
                layout(List.of(new DashboardLayout.Chart("one", 7, 0, 6, 4))),
                layout(List.of(first, new DashboardLayout.Chart("one", 6, 0, 6, 4))),
                layout(List.of(new DashboardLayout.Chart("one", 0, 0, 1, 3))),
                layout(List.of(new DashboardLayout.Chart("one", 0, 0, 2, 2))));
        for (DashboardLayout candidate : invalid) {
            assertThatThrownBy(() -> service.save(candidate)).isInstanceOf(InvalidDataPointException.class);
            assertThat(service.load()).isEqualTo(original);
        }
    }

    @Test
    void rejectsDuplicateChartsAcrossTheDashboardAndGroups() {
        var chart = new DashboardLayout.Chart("chart", 0, 0, 6, 4);
        var layout = new DashboardLayout(List.of(chart),
                List.of(new DashboardLayout.Group("group", "Group", List.of(chart))));
        assertThatThrownBy(() -> service.save(layout)).isInstanceOf(InvalidDataPointException.class);
    }

    @Test
    void removesGroupedChartsWithoutAffectingUngroupedCharts() {
        var ungrouped = new DashboardLayout.Chart("free", 0, 0, 6, 4);
        var grouped = new DashboardLayout.Chart("grouped", 0, 0, 6, 4);
        service.save(new DashboardLayout(List.of(ungrouped),
                List.of(new DashboardLayout.Group("group", "Group", List.of(grouped)))));
        service.removeStatistic("grouped");
        assertThat(service.load().charts()).containsExactly(ungrouped);
        assertThat(service.load().groups().getFirst().charts()).isEmpty();
    }

    @Test
    void corruptLayoutIsNotSilentlyReplaced() throws Exception {
        Files.writeString(directory.resolve("layout.json"), "not json");
        assertThatThrownBy(() -> service.load())
                .isInstanceOf(ch.lonelyporter.statsapp.exception.StatisticStorageException.class);
        assertThat(Files.readString(directory.resolve("layout.json"))).isEqualTo("not json");
    }

    @Test
    void deletingAStatisticRemovesItsPlacementButArchivingKeepsIt() {
        var chart = new ch.lonelyporter.statsapp.web.model.Statistic();
        chart.setId("chart");
        statistics.create(chart);
        service.save(layout(List.of(new DashboardLayout.Chart("chart", 0, 0, 6, 4))));
        StatisticService statisticService = new StatisticService(statistics, service);
        statisticService.toggleArchive("chart");
        assertThat(service.load().charts()).hasSize(1);
        statisticService.deleteStatisticById("chart");
        assertThat(service.load().charts()).isEmpty();
    }

    private DashboardLayout layout(List<DashboardLayout.Chart> charts) {
        return new DashboardLayout(charts, List.of());
    }
}
