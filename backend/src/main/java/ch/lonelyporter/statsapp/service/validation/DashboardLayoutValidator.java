package ch.lonelyporter.statsapp.service.validation;

import ch.lonelyporter.statsapp.exception.InvalidDataPointException;
import ch.lonelyporter.statsapp.web.model.DashboardLayout;
import org.springframework.stereotype.Component;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Component
public class DashboardLayoutValidator {
    private static final int COLUMNS = 12;
    private static final int MIN_WIDTH = 2;
    private static final int MIN_HEIGHT = 3;

    public void validate(DashboardLayout layout) {
        if (layout == null || layout.charts() == null || layout.groups() == null) {
            throw new InvalidDataPointException("Layout must contain charts and groups");
        }
        Set<String> groupIds = new HashSet<>();
        Set<String> statisticIds = new HashSet<>();
        validateCharts(layout.charts(), statisticIds);
        for (DashboardLayout.Group group : layout.groups()) {
            if (group == null || group.id() == null || group.id().isBlank() || !groupIds.add(group.id())
                    || group.title() == null || group.title().isBlank() || group.charts() == null) {
                throw new InvalidDataPointException("Invalid dashboard group");
            }
            validateCharts(group.charts(), statisticIds);
        }
    }

    private void validateCharts(List<DashboardLayout.Chart> charts, Set<String> statisticIds) {
        for (int i = 0; i < charts.size(); i++) {
            DashboardLayout.Chart chart = charts.get(i);
            if (chart == null || chart.statisticId() == null || chart.statisticId().isBlank()
                    || !statisticIds.add(chart.statisticId()) || chart.x() == null || chart.y() == null
                    || chart.width() == null || chart.height() == null
                    || chart.x() < 0 || chart.y() < 0 || chart.width() < MIN_WIDTH || chart.height() < MIN_HEIGHT
                    || (long) chart.x() + chart.width() > COLUMNS
                    || (long) chart.y() + chart.height() > Integer.MAX_VALUE) {
                throw new InvalidDataPointException("Invalid chart placement");
            }
            for (int j = 0; j < i; j++) {
                if (overlaps(chart, charts.get(j))) {
                    throw new InvalidDataPointException("Chart placements must not overlap");
                }
            }
        }
    }

    private boolean overlaps(DashboardLayout.Chart a, DashboardLayout.Chart b) {
        return a.x() < (long) b.x() + b.width() && b.x() < (long) a.x() + a.width()
                && a.y() < (long) b.y() + b.height() && b.y() < (long) a.y() + a.height();
    }
}
