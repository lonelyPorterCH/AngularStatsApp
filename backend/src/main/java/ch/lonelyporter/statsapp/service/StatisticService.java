package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.exception.StatisticNotFoundException;
import ch.lonelyporter.statsapp.persistence.StatisticRepository;
import ch.lonelyporter.statsapp.service.validation.StatisticValidator;
import ch.lonelyporter.statsapp.web.model.Statistic;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.function.BiConsumer;

@Service
@RequiredArgsConstructor
public class StatisticService {

    private final StatisticRepository repository;
    private final LayoutService layoutService;
    private final StatisticValidator validator;

    /**
     * Returns all Statistics, datasets are sorted by index
     */
    public List<Statistic> getStatistics() {
        List<Statistic> stats = new ArrayList<>(repository.findAll());
        stats.forEach(Statistic::sortDatasets);
        return stats;
    }

    /**
     * Returns all archived Statistics, datasets are sorted by index
     */
    public List<Statistic> getArchivedStatistics() {
        List<Statistic> stats = new ArrayList<>(repository.findAllArchived());
        stats.forEach(Statistic::sortDatasets);
        return stats;
    }

    /**
     * Creates a new statistic, if the given statistic is valid
     */
    public void createStatistic(Statistic statistic) {
        validator.validateForCreation(statistic);
        repository.create(statistic);
    }

    /**
     * Gets statistic for given id, datasets are ordered by their index
     */
    public Statistic getStatisticById(String id) {
        Statistic statistic = repository.findById(id);
        statistic.sortDatasets();
        return statistic;
    }

    /**
     * returns if the statistic for the given id is in archive
     */
    public boolean isArchived(String id) {
        return repository.isArchived(id);
    }

    /**
     * Archives a statistic by its id
     */
    public void toggleArchive(String id) {
        repository.toggleArchive(id);
    }

    /**
     * Deletes a statistic by its id.
     */
    public void deleteStatisticById(String id) {
        repository.deleteById(id);
        layoutService.removeStatistic(id);
    }

    /**
     * Add a dataset with a given label to an existing statistic. The dataset will automatically get an index.
     *
     * @param id    of the statistic
     * @param label of the dataset
     */
    public void addDataset(String id, String label) {
        Statistic statistic = repository.findById(id);
        statistic.addDataset(label);
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

    public void setDatasetUnit(String id, String label, String unit) {
        updateDataset(id, label, (statistic, dataset) -> dataset.setUnit(unit == null ? "" : unit.strip()));
    }

    public void setDatasetSmoothing(String id, String label, boolean smoothing) {
        updateDataset(id, label, (statistic, dataset) -> dataset.setSmoothing(smoothing));
    }

    public void setDatasetSmoothingWindow(String id, String label, int smoothingWindow) {
        validator.validateSmoothingWindow(smoothingWindow);
        updateDataset(id, label, (statistic, dataset) -> dataset.setSmoothingWindow(smoothingWindow));
    }

    public void setDatasetInterpolateGaps(String id, String label, boolean interpolateGaps) {
        updateDataset(id, label, (statistic, dataset) -> dataset.setInterpolateGaps(interpolateGaps));
    }

    public void setDatasetPercentageTarget(String id, String label, Double percentageTarget) {
        validator.validatePercentageTarget(percentageTarget);
        updateDataset(id, label, (statistic, dataset) -> dataset.setPercentageTarget(percentageTarget));
    }

    public void renameStatistic(String id, String title) {
        validator.validateTitle(title);
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
        validator.validateYAxisFormatValue(yAxisFormat);
        validator.validatePaceDataPoints(statistic);
        repository.save(statistic);
    }

    public void setPercentageInputMode(String id, String percentageInputMode) {
        validator.validatePercentageInputMode(percentageInputMode);
        Statistic statistic = repository.findById(id);
        statistic.setPercentageInputMode(percentageInputMode);
        repository.save(statistic);
    }

    public void setChartType(String id, String chartType) {
        validator.validateChartType(chartType);
        Statistic statistic = repository.findById(id);
        statistic.setChartType(chartType);
        validator.validateBarDatasets(statistic);
        repository.save(statistic);
    }

    public void setYAxisBounds(String id, Double yAxisMin, Double yAxisMax) {
        validator.validateYAxisBounds(yAxisMin, yAxisMax);
        Statistic statistic = repository.findById(id);
        statistic.setYAxisMin(yAxisMin);
        statistic.setYAxisMax(yAxisMax);
        repository.save(statistic);
    }

    public void setStacked(String id, boolean stacked) {
        Statistic statistic = repository.findById(id);
        validator.validateStacked(statistic, stacked);
        statistic.setStacked(stacked);
        repository.save(statistic);
    }

    public void renameAxes(String id, String xAxisName, String yAxisName, String xAxisScaleType, String xAxisUnit) {
        Statistic statistic = repository.findById(id);
        if (xAxisName != null) statistic.setXAxisName(xAxisName);
        if (yAxisName != null) statistic.setYAxisName(yAxisName);
        if (xAxisScaleType != null) {
            validator.validateXAxisScaleType(xAxisScaleType);
            statistic.setXAxisScaleType(xAxisScaleType);
        }
        if (xAxisUnit != null) statistic.setXAxisUnit(xAxisUnit.trim());
        validator.validateBarDatasets(statistic);
        repository.save(statistic);
    }

    public void addDataPoint(String id, String datasetLabel, Statistic.DataPoint dataPoint) {
        Statistic statistic = repository.findById(id);
        validator.validateDataPoint(statistic, dataPoint);
        updateDataset(statistic, id, datasetLabel, (ignored, dataset) -> {
            dataset.getDataPoints().add(dataPoint);
            validator.validateBarDatasets(statistic);
        });
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

}
