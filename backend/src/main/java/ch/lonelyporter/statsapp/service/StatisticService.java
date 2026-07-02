package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.persistence.StatisticRepository;
import ch.lonelyporter.statsapp.web.model.Statistic;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class StatisticService {

    private final StatisticRepository repository;

    public List<Statistic> getStatistics() {
        List<Statistic> stats = new ArrayList<>(repository.findAll());
        assignMissingStatisticIndices(stats);
        stats.sort(Comparator.comparing(
                Statistic::getIndex,
                Comparator.nullsLast(Integer::compareTo)
        ));
        stats.forEach(s -> s.getDatasets().sort(Comparator.comparingInt(Statistic.Dataset::getIndex)));
        return stats;
    }

    /**
     * Saves the statistic, the given index will be 1 higher than the current highest index (or 0 if none found)
     *
     */
    public void createStatistic(Statistic statistic) {
        int nextStatisticIndex = repository.findAll().stream()
                .map(Statistic::getIndex)
                .filter(Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(-1) + 1;
        statistic.setIndex(nextStatisticIndex);
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

    public void setDatasetColor(String id, String label, String color) {
        Statistic statistic = repository.findById(id);
        statistic.getDatasets().stream()
                .filter(ds -> ds.getLabel().equals(label))
                .findFirst()
                .ifPresent(ds -> ds.setColor(color));
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

    private void assignMissingStatisticIndices(List<Statistic> statistics) {
        int highestExistingIndex = statistics.stream()
                .map(Statistic::getIndex)
                .filter(Objects::nonNull)
                .max(Integer::compareTo)
                .orElse(-1);

        for (Statistic statistic : statistics) {
            if (statistic.getIndex() == null) {
                statistic.setIndex(++highestExistingIndex);
                repository.save(statistic);
            }
        }
    }
}
