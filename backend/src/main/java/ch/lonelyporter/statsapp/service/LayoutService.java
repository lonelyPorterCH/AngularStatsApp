package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.exception.InvalidDataPointException;
import ch.lonelyporter.statsapp.persistence.LayoutRepository;
import ch.lonelyporter.statsapp.web.model.DashboardLayout;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashSet;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class LayoutService {
    private static final int COLUMNS = 12;
    private static final int MIN_WIDTH = 2;
    private static final int MIN_HEIGHT = 3;
    private final LayoutRepository repository;

    public DashboardLayout load() {
        DashboardLayout layout = repository.load();
        validate(layout);
        return layout;
    }

    public void save(DashboardLayout layout) {
        validate(layout);
        repository.save(layout);
    }

    public void removeStatistic(String id) {
        DashboardLayout layout = load();
        if (layout.groups().stream().noneMatch(group ->
                group.charts().stream().anyMatch(chart -> chart.statisticId().equals(id)))) {
            return;
        }
        var groups = layout.groups().stream()
                .map(group -> new DashboardLayout.Group(group.id(), group.title(),
                        group.charts().stream().filter(chart -> !chart.statisticId().equals(id)).toList()))
                .toList();
        repository.save(new DashboardLayout(groups));
    }

    private void validate(DashboardLayout layout) {
        if (layout == null || layout.groups() == null || layout.groups().isEmpty()
                || layout.groups().getFirst() == null || !"ungrouped".equals(layout.groups().getFirst().id())) {
            throw new InvalidDataPointException("Layout must start with the ungrouped section");
        }
        Set<String> groupIds = new HashSet<>();
        Set<String> statisticIds = new HashSet<>();
        for (DashboardLayout.Group group : layout.groups()) {
            if (group == null || group.id() == null || group.id().isBlank() || !groupIds.add(group.id())
                    || group.title() == null || group.title().isBlank() || group.charts() == null) {
                throw new InvalidDataPointException("Invalid dashboard group");
            }
            for (int i = 0; i < group.charts().size(); i++) {
                DashboardLayout.Chart chart = group.charts().get(i);
                if (chart == null || chart.statisticId() == null || chart.statisticId().isBlank()
                        || !statisticIds.add(chart.statisticId()) || chart.x() == null || chart.y() == null
                        || chart.width() == null || chart.height() == null
                        || chart.x() < 0 || chart.y() < 0 || chart.width() < MIN_WIDTH || chart.height() < MIN_HEIGHT
                        || (long) chart.x() + chart.width() > COLUMNS
                        || (long) chart.y() + chart.height() > Integer.MAX_VALUE) {
                    throw new InvalidDataPointException("Invalid chart placement");
                }
                for (int j = 0; j < i; j++) {
                    if (overlaps(chart, group.charts().get(j))) {
                        throw new InvalidDataPointException("Chart placements must not overlap");
                    }
                }
            }
        }
    }

    private boolean overlaps(DashboardLayout.Chart a, DashboardLayout.Chart b) {
        return a.x() < (long) b.x() + b.width() && b.x() < (long) a.x() + a.width()
                && a.y() < (long) b.y() + b.height() && b.y() < (long) a.y() + a.height();
    }
}
