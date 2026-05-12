package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.persistence.StatisticRepository;
import ch.lonelyporter.statsapp.web.model.Statistic;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
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

    public Statistic getStatisticById(String id) {
        return repository.findById(id);
    }

    public void deleteStatisticById(String id) {
        repository.deleteById(id);
    }

    public void addDataset(String id, String label) {
        Statistic statistic = repository.findById(id);
        statistic.getDatasets().add(new Statistic.Dataset(label, new ArrayList<>()));
        repository.save(statistic);
    }

    public void deleteDataset(String id, String label) {
        Statistic statistic = repository.findById(id);
        statistic.getDatasets().removeIf(ds -> ds.getLabel().equals(label));
        repository.save(statistic);
    }

    public void renameDataset(String id, String oldLabel, String newLabel) {
        Statistic statistic = repository.findById(id);
        statistic.getDatasets().stream()
                .filter(ds -> ds.getLabel().equals(oldLabel))
                .findFirst()
                .ifPresent(ds -> ds.setLabel(newLabel));
        repository.save(statistic);
    }

    public void renameAxes(String id, String xAxisName, String yAxisName) {
        Statistic statistic = repository.findById(id);
        if (xAxisName != null) statistic.setXAxisName(xAxisName);
        if (yAxisName != null) statistic.setYAxisName(yAxisName);
        repository.save(statistic);
    }

    public void addDataPoint(String id, String datasetLabel, Statistic.DataPoint dataPoint) {
        Statistic statistic = repository.findById(id);
        statistic.getDatasets().stream()
                .filter(ds -> ds.getLabel().equals(datasetLabel))
                .findFirst()
                .ifPresent(ds -> ds.getDataPoints().add(dataPoint));
        repository.save(statistic);
    }

    public void deleteDataPoint(String id, String datasetLabel, Statistic.DataPoint dataPoint) {
        Statistic statistic = repository.findById(id);
        statistic.getDatasets().stream()
                .filter(ds -> ds.getLabel().equals(datasetLabel))
                .findFirst()
                .ifPresent(ds -> ds.getDataPoints().removeIf(dp ->
                        dp.getX().equals(dataPoint.getX()) && dp.getY().equals(dataPoint.getY())
                ));
        repository.save(statistic);
    }
}
