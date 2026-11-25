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
        load().withoutStatistic(id).ifPresent(repository::save);
    }
}
