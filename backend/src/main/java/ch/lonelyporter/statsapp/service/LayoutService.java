package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.persistence.LayoutRepository;
import ch.lonelyporter.statsapp.service.validation.DashboardLayoutValidator;
import ch.lonelyporter.statsapp.web.model.DashboardLayout;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class LayoutService {
    private final LayoutRepository repository;
    private final DashboardLayoutValidator validator;

    public DashboardLayout load() {
        DashboardLayout layout = repository.load();
        validator.validate(layout);
        return layout;
    }

    public void save(DashboardLayout layout) {
        validator.validate(layout);
        repository.save(layout);
    }

    public void removeStatistic(String id) {
        DashboardLayout layout = load();
        if (layout.charts().stream().noneMatch(chart -> chart.statisticId().equals(id))
                && layout.groups().stream().noneMatch(group ->
                        group.charts().stream().anyMatch(chart -> chart.statisticId().equals(id)))) {
            return;
        }
        var charts = layout.charts().stream().filter(chart -> !chart.statisticId().equals(id)).toList();
        var groups = layout.groups().stream()
                .map(group -> new DashboardLayout.Group(group.id(), group.title(),
                        group.charts().stream().filter(chart -> !chart.statisticId().equals(id)).toList()))
                .toList();
        repository.save(new DashboardLayout(charts, groups));
    }
}
