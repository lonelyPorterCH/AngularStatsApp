package ch.lonelyporter.statsapp.web.model;

import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class Statistic {
    private String id;
    private Integer index;
    private String title;
    private boolean reverse;
    @Getter(AccessLevel.NONE)
    private Boolean smoothing = false;
    private String xAxisName;
    private String yAxisName;
    private String xAxisScaleType = "time";
    private String xAxisUnit = "";
    private List<Dataset> datasets = new ArrayList<>();

    public boolean isSmoothing() {
        return Boolean.TRUE.equals(smoothing);
    }

    public String getXAxisScaleType() {
        return xAxisScaleType == null ? "time" : xAxisScaleType;
    }

    public String getXAxisUnit() {
        return xAxisUnit == null ? "" : xAxisUnit;
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Dataset {
        private String label;
        private int index;
        private boolean filled;
        private String color;
        private List<DataPoint> dataPoints = new ArrayList<>();

        public Dataset(String label, List<DataPoint> dataPoints) {
            this.label = label;
            this.dataPoints = dataPoints;
            this.filled = false;
        }
    }

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    @EqualsAndHashCode
    @ToString
    public static class DataPoint {
        private String x;
        private String y;
    }
}
