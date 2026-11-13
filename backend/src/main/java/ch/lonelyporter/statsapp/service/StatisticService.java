package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.exception.InvalidDataPointException;
import ch.lonelyporter.statsapp.exception.StatisticNotFoundException;
import ch.lonelyporter.statsapp.persistence.StatisticRepository;
import ch.lonelyporter.statsapp.web.model.Statistic;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.function.BiConsumer;

@Service
@RequiredArgsConstructor
public class StatisticService {

    public static final String LINEAR = "linear";
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
        validateChartType(statistic.getChartType());
        validateYAxisFormat(statistic);
        validateYAxisBounds(statistic.getYAxisMin(), statistic.getYAxisMax());
        validateBarDatasets(statistic);
        statistic.getDatasets().forEach(dataset -> validateSmoothingWindow(dataset.getSmoothingWindow()));
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

    public void setDatasetSmoothing(String id, String label, boolean smoothing) {
        updateDataset(id, label, (statistic, dataset) -> dataset.setSmoothing(smoothing));
    }

    public void setDatasetSmoothingWindow(String id, String label, int smoothingWindow) {
        validateSmoothingWindow(smoothingWindow);
        updateDataset(id, label, (statistic, dataset) -> dataset.setSmoothingWindow(smoothingWindow));
    }

    private void validateSmoothingWindow(int smoothingWindow) {
        if (smoothingWindow < 1) {
            throw new InvalidDataPointException("Smoothing window must be a positive whole number");
        }
    }

    public void setSmoothing(String id, boolean smoothing) {
        // Deprecated: smoothing is now controlled at the dataset level
        // This method is kept for backward compatibility but does nothing
    }

    public void renameStatistic(String id, String title) {
        if (title == null || title.isBlank()) {
            throw new InvalidDataPointException("Graph title must not be blank");
        }
        Statistic statistic = repository.findById(id);
        statistic.setTitle(title.strip());
        repository.save(statistic);
    }

    public void setEffortComparison(String id, boolean effortComparison) {
        Statistic statistic = repository.findById(id);
        statistic.setEffortComparison(effortComparison);
        repository.save(statistic);
    }

    public void setYAxisFormat(String id, String yAxisFormat) {
        Statistic statistic = repository.findById(id);
        statistic.setYAxisFormat(yAxisFormat);
        if (yAxisFormat == null) {
            throw new InvalidDataPointException("Y axis format must be number or pace");
        }
        validateYAxisFormat(statistic);
        repository.save(statistic);
    }

    private void validateYAxisFormat(Statistic statistic) {
        if (!"number".equals(statistic.getYAxisFormat()) && !"pace".equals(statistic.getYAxisFormat())) {
            throw new InvalidDataPointException("Y axis format must be number or pace");
        }
        if ("pace".equals(statistic.getYAxisFormat())) {
            statistic.getDatasets().forEach(dataset -> dataset.getDataPoints().forEach(this::validatePace));
        }
    }

    private void validatePace(Statistic.DataPoint point) {
        String value = point.getY() == null ? "" : point.getY().strip();
        if (!value.matches("\\d+(?:[.:]\\d{1,2})?")) {
            throw new InvalidDataPointException("Pace must use m:ss or M.SS (e.g. 5:09 or 5.09)");
        }
        String[] parts = value.split("[.:]");
        String seconds = parts.length == 1 ? "0" : parts[1];
        if (value.contains(".") && seconds.length() == 1) seconds += "0";
        if (Integer.parseInt(seconds) >= 60 || !Double.isFinite(Double.parseDouble(parts[0]) * 60)) {
            throw new InvalidDataPointException("Pace must have finite minutes and seconds between 00 and 59");
        }
    }

    public void setChartType(String id, String chartType) {
        validateChartType(chartType);
        Statistic statistic = repository.findById(id);
        statistic.setChartType(chartType);
        validateBarDatasets(statistic);
        repository.save(statistic);
    }

    private void validateChartType(String chartType) {
        if (!"line".equals(chartType) && !"bar".equals(chartType)) {
            throw new InvalidDataPointException("Chart type must be line or bar");
        }
    }

    private void validateBarDatasets(Statistic statistic) {
        if (!"bar".equals(statistic.getChartType())) return;
        for (Statistic.Dataset dataset : statistic.getDatasets()) {
            var xValues = new HashSet<>();
            for (Statistic.DataPoint point : dataset.getDataPoints()) {
                validateDataPoint(statistic, point);
                Object x = LINEAR.equals(statistic.getXAxisScaleType())
                        ? Double.parseDouble(point.getX()) + 0.0 : point.getX();
                if (!xValues.add(x)) {
                    throw new InvalidDataPointException("Bar charts require one value per dataset and X value. Edit the existing point for "
                            + dataset.getLabel() + " at " + point.getX() + ".");
                }
            }
        }
    }

    public void setYAxisBounds(String id, Double yAxisMin, Double yAxisMax) {
        validateYAxisBounds(yAxisMin, yAxisMax);
        Statistic statistic = repository.findById(id);
        statistic.setYAxisMin(yAxisMin);
        statistic.setYAxisMax(yAxisMax);
        repository.save(statistic);
    }

    private void validateYAxisBounds(Double min, Double max) {
        if ((min != null && !Double.isFinite(min)) || (max != null && !Double.isFinite(max))) {
            throw new InvalidDataPointException("Y-axis bounds must be finite numbers");
        }
        if (min != null && max != null && min >= max) {
            throw new InvalidDataPointException("Y-axis minimum must be less than maximum");
        }
    }

    public void setStacked(String id, boolean stacked) {
        Statistic statistic = repository.findById(id);
        if (stacked && statistic.getDatasets().size() < 2) {
            throw new InvalidDataPointException("Stacked charts require at least two datasets");
        }
        statistic.setStacked(stacked);
        repository.save(statistic);
    }

    public void renameAxes(String id, String xAxisName, String yAxisName, String xAxisScaleType, String xAxisUnit) {
        Statistic statistic = repository.findById(id);
        if (xAxisName != null) statistic.setXAxisName(xAxisName);
        if (yAxisName != null) statistic.setYAxisName(yAxisName);
        if (xAxisScaleType != null) {
            if (!"time".equals(xAxisScaleType) && !LINEAR.equals(xAxisScaleType)) {
                throw new InvalidDataPointException("Unsupported x-axis scale type: " + xAxisScaleType);
            }
            statistic.setXAxisScaleType(xAxisScaleType);
        }
        if (xAxisUnit != null) statistic.setXAxisUnit(xAxisUnit.trim());
        validateBarDatasets(statistic);
        repository.save(statistic);
    }

    public void addDataPoint(String id, String datasetLabel, Statistic.DataPoint dataPoint) {
        Statistic statistic = repository.findById(id);
        validateDataPoint(statistic, dataPoint);
        updateDataset(statistic, id, datasetLabel, (ignored, dataset) -> {
            dataset.getDataPoints().add(dataPoint);
            validateBarDatasets(statistic);
        });
    }

    private void validateDataPoint(Statistic statistic, Statistic.DataPoint dataPoint) {
        if ("pace".equals(statistic.getYAxisFormat())) validatePace(dataPoint);
        if (!LINEAR.equals(statistic.getXAxisScaleType())) {
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
