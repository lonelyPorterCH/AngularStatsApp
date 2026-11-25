package ch.lonelyporter.statsapp.service.validation;

import ch.lonelyporter.statsapp.exception.InvalidDataPointException;
import ch.lonelyporter.statsapp.web.model.Statistic;
import org.springframework.stereotype.Component;

import java.util.HashSet;

@Component
public class StatisticValidator {

    public static final String LINEAR = "linear";

    public void validateForCreation(Statistic statistic) {
        validateChartType(statistic.getChartType());
        validateYAxisFormatValue(statistic.getYAxisFormat());
        validatePaceDataPoints(statistic);
        validatePercentageInputMode(statistic.getPercentageInputMode());
        validateYAxisBounds(statistic.getYAxisMin(), statistic.getYAxisMax());
        validateBarDatasets(statistic);
        statistic.getDatasets().forEach(dataset -> validateSmoothingWindow(dataset.getSmoothingWindow()));
        statistic.getDatasets().forEach(dataset -> validatePercentageTarget(dataset.getPercentageTarget()));
    }

    public void validateTitle(String title) {
        if (title == null || title.isBlank()) {
            throw new InvalidDataPointException("Graph title must not be blank");
        }
    }

    public void validatePercentageTarget(Double percentageTarget) {
        if (percentageTarget == null || !Double.isFinite(percentageTarget) || percentageTarget <= 0) {
            throw new InvalidDataPointException("100% target must be a positive finite number");
        }
    }

    public void validateSmoothingWindow(int smoothingWindow) {
        if (smoothingWindow < 1) {
            throw new InvalidDataPointException("Smoothing window must be a positive whole number");
        }
    }

    public void validateYAxisFormatValue(String yAxisFormat) {
        if (!"number".equals(yAxisFormat) && !"pace".equals(yAxisFormat)
                && !"percentage".equals(yAxisFormat)) {
            throw new InvalidDataPointException("Y axis format must be number, pace or percentage");
        }
    }

    public void validatePaceDataPoints(Statistic statistic) {
        if ("pace".equals(statistic.getYAxisFormat())) {
            statistic.getDatasets().forEach(dataset -> dataset.getDataPoints().forEach(this::validatePace));
        }
    }

    public void validatePercentageInputMode(String percentageInputMode) {
        if (!"number".equals(percentageInputMode) && !"percentage".equals(percentageInputMode)) {
            throw new InvalidDataPointException("Percentage input mode must be number or percentage");
        }
    }

    public void validatePace(Statistic.DataPoint point) {
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

    public void validateChartType(String chartType) {
        if (!"line".equals(chartType) && !"bar".equals(chartType)) {
            throw new InvalidDataPointException("Chart type must be line or bar");
        }
    }

    public void validateBarDatasets(Statistic statistic) {
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

    public void validateYAxisBounds(Double min, Double max) {
        if ((min != null && !Double.isFinite(min)) || (max != null && !Double.isFinite(max))) {
            throw new InvalidDataPointException("Y-axis bounds must be finite numbers");
        }
        if (min != null && max != null && min >= max) {
            throw new InvalidDataPointException("Y-axis minimum must be less than maximum");
        }
    }

    public void validateStacked(Statistic statistic, boolean stacked) {
        if (stacked && statistic.getDatasets().size() < 2) {
            throw new InvalidDataPointException("Stacked charts require at least two datasets");
        }
    }

    public void validateXAxisScaleType(String xAxisScaleType) {
        if (!"time".equals(xAxisScaleType) && !LINEAR.equals(xAxisScaleType)) {
            throw new InvalidDataPointException("Unsupported x-axis scale type: " + xAxisScaleType);
        }
    }

    public void validateDataPoint(Statistic statistic, Statistic.DataPoint dataPoint) {
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
}
