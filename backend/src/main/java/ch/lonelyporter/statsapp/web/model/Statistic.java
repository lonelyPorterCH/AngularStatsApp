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
    private String title;
    private boolean reverse;
    private String xAxisName;
    private String yAxisName;
    private List<Dataset> datasets = new ArrayList<>();

    @Getter
    @Setter
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Dataset {
        private String label;
        private List<DataPoint> dataPoints = new ArrayList<>();
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