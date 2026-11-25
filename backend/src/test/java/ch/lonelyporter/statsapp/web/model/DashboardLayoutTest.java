package ch.lonelyporter.statsapp.web.model;

import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DashboardLayoutTest {

    @Test
    void withoutStatisticRemovesPlacementsFromChartsAndGroups() {
        DashboardLayout.Chart dashboardChart = chart("dashboard");
        DashboardLayout.Chart target = chart("target");
        DashboardLayout.Chart remaining = chart("remaining");
        DashboardLayout layout = new DashboardLayout(
                List.of(dashboardChart, target),
                List.of(new DashboardLayout.Group("group", "Group", List.of(target, remaining)))
        );

        assertThat(layout.withoutStatistic("target")).contains(new DashboardLayout(
                List.of(dashboardChart),
                List.of(new DashboardLayout.Group("group", "Group", List.of(remaining)))
        ));
    }

    @Test
    void withoutMissingStatisticIsEmpty() {
        DashboardLayout layout = new DashboardLayout(List.of(chart("present")), List.of());

        assertThat(layout.withoutStatistic("missing")).isEmpty();
    }

    private static DashboardLayout.Chart chart(String statisticId) {
        return new DashboardLayout.Chart(statisticId, 0, 0, 6, 4);
    }
}
