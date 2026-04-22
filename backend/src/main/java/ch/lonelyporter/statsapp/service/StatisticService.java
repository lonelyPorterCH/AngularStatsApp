package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.persistence.StatisticRepository;
import ch.lonelyporter.statsapp.web.model.Statistic;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class StatisticService {

    private final StatisticRepository repository;

    public List<Statistic> getStatistics() {
        return repository.findAll();
    }

    public void createStatistic(Statistic statistic) {
        repository.save(statistic);
    }

    public void addDataPoint(String id, Statistic.DataPoint dataPoint) {
        Statistic statistic = repository.findById(id);
        statistic.getDataPoints().add(dataPoint);
        repository.save(statistic);
    }
}
