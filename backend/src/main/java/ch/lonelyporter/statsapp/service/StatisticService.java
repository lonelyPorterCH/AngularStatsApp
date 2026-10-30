package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.exception.InvalidDataPointException;
import ch.lonelyporter.statsapp.exception.StatisticNotFoundException;
import ch.lonelyporter.statsapp.persistence.StatisticRepository;
import ch.lonelyporter.statsapp.web.model.Statistic;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.function.BiConsumer;

@Service
@RequiredArgsConstructor
public class StatisticService {

    private final StatisticRepository repository;

    public List<Statistic> getStatistics() {
        List<Statistic> stats = new ArrayList<>(repository.findAll());
        prepareStatistics(stats, true);
        return stats;
    }

    public List<Statistic> getArchivedStatistics() {
        List<Statistic> stats = new ArrayList<>(repository.findAllArchived());
        prepareStatistics(stats, false);
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
        repository.create(statistic);
    }

    /**
     * Gets statistic for given id, datasets are ordered by their index
     */
    public Statistic getStatisticById(String id) {
        Statistic statistic = repository.findById(id);
        sortDatasets(statistic);
        return statistic;
    }

    public boolean isArchived(String id) {
        return repository.isArchived(id);
    }

    public void toggleArchive(String id) {
        repository.toggleArchive(id);
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
        updateDataset(id, label, (statistic, dataset) -> statistic.getDatasets().remove(dataset));
    }

    public void renameDataset(String id, String oldLabel, String newLabel) {
        updateDataset(id, oldLabel, (statistic, dataset) -> dataset.setLabel(newLabel));
    }

    public void setDatasetFilled(String id, String label, boolean filled) {
        updateDataset(id, label, (statistic, dataset) -> dataset.setFilled(filled));
    }

    public void setDatasetColor(String id, String label, String color) {
        updateDataset(id, label, (statistic, dataset) -> dataset.setColor(color));
    }

    public void renameStatistic(String id, String title) {
        if (title == null || title.isBlank()) {
            throw new InvalidDataPointException("Graph title must not be blank");
        }
        Statistic statistic = repository.findById(id);
        statistic.setTitle(title.strip());
        repository.save(statistic);
    }

    public void setSmoothing(String id, boolean smoothing) {
        Statistic statistic = repository.findById(id);
        statistic.setSmoothing(smoothing);
        repository.save(statistic);
    }

    public void renameAxes(String id, String xAxisName, String yAxisName, String xAxisScaleType, String xAxisUnit) {
        Statistic statistic = repository.findById(id);
        if (xAxisName != null) statistic.setXAxisName(xAxisName);
        if (yAxisName != null) statistic.setYAxisName(yAxisName);
        if (xAxisScaleType != null) {
            if (!"time".equals(xAxisScaleType) && !"linear".equals(xAxisScaleType)) {
                throw new InvalidDataPointException("Unsupported x-axis scale type: " + xAxisScaleType);
            }
            statistic.setXAxisScaleType(xAxisScaleType);
        }
        if (xAxisUnit != null) statistic.setXAxisUnit(xAxisUnit.trim());
        repository.save(statistic);
    }

    public void addDataPoint(String id, String datasetLabel, Statistic.DataPoint dataPoint) {
        Statistic statistic = repository.findById(id);
        validateDataPoint(statistic, dataPoint);
        updateDataset(statistic, id, datasetLabel, (ignored, dataset) -> dataset.getDataPoints().add(dataPoint));
    }

    private void validateDataPoint(Statistic statistic, Statistic.DataPoint dataPoint) {
        if (!"linear".equals(statistic.getXAxisScaleType())) {
            return;
        }

        try {
            double x = Double.parseDouble(dataPoint.getX());
            if (!Double.isFinite(x) || x < 0) {
                throw new NumberFormatException();
            }
        } catch (NumberFormatException | NullPointerException e) {
            throw new InvalidDataPointException("Linear x-axis values must be non-negative finite numbers");
        }
    }

    public void deleteDataPoint(String id, String datasetLabel, Statistic.DataPoint dataPoint) {
        updateDataset(id, datasetLabel, (ignored, dataset) -> dataset.getDataPoints().removeIf(dp ->
                dp.getX().equals(dataPoint.getX()) && dp.getY().equals(dataPoint.getY())
        ));
    }

    public void reorderDatasets(String id, List<String> orderedLabels) {
        Statistic statistic = repository.findById(id);
        for (int i = 0; i < orderedLabels.size(); i++) {
            findDataset(statistic, id, orderedLabels.get(i)).setIndex(i);
        }
        repository.save(statistic);
    }

    private void updateDataset(String id, String label, BiConsumer<Statistic, Statistic.Dataset> update) {
        Statistic statistic = repository.findById(id);
        updateDataset(statistic, id, label, update);
    }

    private void updateDataset(Statistic statistic, String statisticId, String label,
                               BiConsumer<Statistic, Statistic.Dataset> update) {
        Statistic.Dataset dataset = findDataset(statistic, statisticId, label);
        update.accept(statistic, dataset);
        repository.save(statistic);
    }

    private Statistic.Dataset findDataset(Statistic statistic, String statisticId, String label) {
        return statistic.getDatasets().stream()
                .filter(dataset -> Objects.equals(dataset.getLabel(), label))
                .findFirst()
                .orElseThrow(() -> new StatisticNotFoundException(
                        "dataset '" + label + "' in statistic '" + statisticId + "'"));
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

    private void prepareStatistics(List<Statistic> statistics, boolean persistMissingIndices) {
        if (persistMissingIndices) {
            assignMissingStatisticIndices(statistics);
        }

        statistics.sort(Comparator.comparing(
                Statistic::getIndex,
                Comparator.nullsLast(Integer::compareTo)
        ));
        statistics.forEach(this::sortDatasets);
    }

    private void sortDatasets(Statistic statistic) {
        if (statistic.getDatasets() != null) {
            statistic.getDatasets().sort(Comparator.comparingInt(Statistic.Dataset::getIndex));
        }
    }
}
