package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.persistence.StatisticRepository;
import ch.lonelyporter.statsapp.web.model.Statistic;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class StatisticService {

    private final StatisticRepository repository;

    public List<Statistic> getStatistics() {
        List<Statistic> stats = repository.findAll();
        stats.forEach(s -> s.getDatasets().sort(Comparator.comparingInt(Statistic.Dataset::getIndex)));
        return stats;
    }

    public void createStatistic(Statistic statistic) {
        repository.save(statistic);
    }

    /**
     * Gets statistic for given id, datasets are ordered by their index
     */
    public Statistic getStatisticById(String id) {
        Statistic statistic = repository.findById(id);
        statistic.getDatasets().sort(Comparator.comparingInt(Statistic.Dataset::getIndex));
        return statistic;
    }

    public void deleteStatisticById(String id) {
        repository.deleteById(id);
    }

    /**
     * Add a dataset with a given label to an existing statistic. The dataset will automatically get an index.
     *
     * @param id    of the statistic
     * @param label of the dataset
     */
    public void addDataset(String id, String label) {
        Statistic statistic = repository.findById(id);
        int nextIndex = statistic.getDatasets().stream()
                .mapToInt(Statistic.Dataset::getIndex)
                .max()
                .orElse(-1) + 1;
        Statistic.Dataset ds = new Statistic.Dataset(label, new ArrayList<>());
        ds.setIndex(nextIndex);
        statistic.getDatasets().add(ds);
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

    public void setDatasetFilled(String id, String label, boolean filled) {
        Statistic statistic = repository.findById(id);
        statistic.getDatasets().stream()
                .filter(ds -> ds.getLabel().equals(label))
                .findFirst()
                .ifPresent(ds -> ds.setFilled(filled));
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

    public void reorderDatasets(String id, List<String> orderedLabels) {
        Statistic statistic = repository.findById(id);
        for (int i = 0; i < orderedLabels.size(); i++) {
            final int index = i;
            final String label = orderedLabels.get(i);
            statistic.getDatasets().stream()
                    .filter(ds -> ds.getLabel().equals(label))
                    .findFirst()
                    .ifPresent(ds -> ds.setIndex(index));
        }
        repository.save(statistic);
    }
}
