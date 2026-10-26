package ch.lonelyporter.statsapp.web.model;

import ch.lonelyporter.statsapp.domain.harvest.HarvestEntry;

import java.time.LocalDate;
import java.util.List;

public record HarvestView(
        int year,
        List<PlantView> plants,
        List<PlantTotal> plantTotals,
        List<SeriesView> plantSeries,
        List<ChartPoint> globalSeries,
        int totalQuantity) {

    public record PlantView(String id, String name, List<HarvestEntry> harvests) {
    }

    public record PlantTotal(String plantId, String plantName, int totalQuantity) {
    }

    public record SeriesView(String plantId, String plantName, List<ChartPoint> points) {
    }

    public record ChartPoint(LocalDate date, int quantity) {
    }
}
