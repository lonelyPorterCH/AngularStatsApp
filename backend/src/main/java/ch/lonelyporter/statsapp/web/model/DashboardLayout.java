package ch.lonelyporter.statsapp.web.model;

import java.util.List;
import java.util.Optional;

public record DashboardLayout(List<Chart> charts, List<Group> groups) {
    public record Group(String id, String title, List<Chart> charts) {
    }

    public record Chart(String statisticId, Integer x, Integer y, Integer width, Integer height) {
    }

    public Optional<DashboardLayout> withoutStatistic(String statisticId) {
        if (!containsStatistic(statisticId)) {
            return Optional.empty();
        }
        List<Chart> remainingCharts = removeStatisticFromCharts(charts, statisticId);
        List<Group> remainingGroups = groups.stream()
                .map(group -> new Group(group.id(), group.title(),
                        removeStatisticFromCharts(group.charts(), statisticId)))
                .toList();
        return Optional.of(new DashboardLayout(remainingCharts, remainingGroups));
    }

    private boolean containsStatistic(String statisticId) {
        return charts.stream().anyMatch(chart -> chart.statisticId().equals(statisticId))
                || groups.stream().anyMatch(group -> group.charts().stream()
                        .anyMatch(chart -> chart.statisticId().equals(statisticId)));
    }

    private static List<Chart> removeStatisticFromCharts(List<Chart> charts, String statisticId) {
        return charts.stream()
                .filter(chart -> !chart.statisticId().equals(statisticId))
                .toList();
    }
}
