package ch.lonelyporter.statsapp.service.validation;

import ch.lonelyporter.statsapp.web.model.Statistic;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

class StatisticValidatorTest {

    private final StatisticValidator validator = new StatisticValidator();

    @Test
    void validatesPaceAndLinearXAxisValuesWithoutServiceOrRepository() {
        Statistic statistic = createStatistic();
        statistic.setXAxisScaleType(StatisticValidator.LINEAR);
        statistic.setYAxisFormat("pace");

        validator.validateDataPoint(statistic, new Statistic.DataPoint("12.5", "5:09"));

        assertThatThrownBy(() ->
                validator.validateDataPoint(statistic, new Statistic.DataPoint("-1", "5:09")))
                .hasMessage("Linear x-axis values must be non-negative finite numbers");
        assertThatThrownBy(() ->
                validator.validateDataPoint(statistic, new Statistic.DataPoint("12.5", "5:60")))
                .hasMessage("Pace must have finite minutes and seconds between 00 and 59");
    }

    @Test
    void rejectsBarDatasetsWithEquivalentLinearXAxisValues() {
        Statistic statistic = createStatistic();
        statistic.setXAxisScaleType(StatisticValidator.LINEAR);
        statistic.setChartType("bar");
        statistic.getDatasets().getFirst().getDataPoints().addAll(List.of(
                new Statistic.DataPoint("2", "100"),
                new Statistic.DataPoint("02.0", "200")
        ));

        assertThatThrownBy(() -> validator.validateBarDatasets(statistic))
                .hasMessageContaining("Bar charts require one value per dataset and X value");
    }

    @Test
    void rejectsInvalidYAxisBoundsAndPercentageTargets() {
        assertThatThrownBy(() -> validator.validateYAxisBounds(10.0, 10.0))
                .hasMessage("Y-axis minimum must be less than maximum");
        assertThatThrownBy(() -> validator.validateYAxisBounds(Double.NaN, 20.0))
                .hasMessage("Y-axis bounds must be finite numbers");
        assertThatThrownBy(() -> validator.validatePercentageTarget(0.0))
                .hasMessage("100% target must be a positive finite number");
    }

    private static Statistic createStatistic() {
        Statistic statistic = new Statistic();
        statistic.setDatasets(new ArrayList<>(List.of(new Statistic.Dataset("Series", new ArrayList<>()))));
        return statistic;
    }
}
