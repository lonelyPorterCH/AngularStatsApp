package ch.lonelyporter.statsapp.web.api;

import ch.lonelyporter.statsapp.service.StatisticService;
import ch.lonelyporter.statsapp.web.model.Statistic;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/stats")
public class StatsApiController {

    private final StatisticService statisticService;

    public record DataPointRequest(String datasetLabel, String x, String y) {
    }

    public record FilledRequest(Boolean filled) {
    }

    public record ColorRequest(String color) {
    }

    public record SmoothingRequest(Boolean smoothing) {
    }

    public record SmoothingWindowRequest(Double smoothingWindow) {
    }

    public record EffortComparisonRequest(Boolean effortComparison) {
    }

    public record YAxisFormatRequest(String yAxisFormat) {
    }

    public record StackedRequest(Boolean stacked) {
    }

    public record YAxisBoundsRequest(Double yAxisMin, Double yAxisMax) {
    }

    public record TitleRequest(String title) {
    }

    public record ChartTypeRequest(String chartType) {
    }

    @GetMapping
    public ResponseEntity<List<Statistic>> getStatistics() {
        return ResponseEntity.ok(statisticService.getStatistics());
    }

    @GetMapping("/archived")
    public ResponseEntity<List<Statistic>> getArchivedStatistics() {
        return ResponseEntity.ok(statisticService.getArchivedStatistics());
    }

    @PostMapping
    public ResponseEntity<Void> createStatistic(@RequestBody Statistic statistic) {
        statisticService.createStatistic(statistic);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Statistic> getStatisticById(@PathVariable String id) {
        return ResponseEntity.ok(statisticService.getStatisticById(id));
    }

    @GetMapping("/{id}/archived")
    public ResponseEntity<Boolean> isArchived(@PathVariable String id) {
        return ResponseEntity.ok(statisticService.isArchived(id));
    }

    @PatchMapping("/{id}/archived")
    public ResponseEntity<Void> toggleArchive(@PathVariable String id) {
        statisticService.toggleArchive(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStatisticById(@PathVariable String id) {
        statisticService.deleteStatisticById(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/dataset")
    public ResponseEntity<Void> addDataset(@PathVariable String id, @RequestBody Map<String, String> body) {
        statisticService.addDataset(id, body.get("label"));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/dataset/{label}")
    public ResponseEntity<Void> deleteDataset(@PathVariable String id, @PathVariable String label) {
        statisticService.deleteDataset(id, label);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/dataset/{label}")
    public ResponseEntity<Void> renameDataset(@PathVariable String id, @PathVariable String label,
                                              @RequestBody Map<String, String> body) {
        statisticService.renameDataset(id, label, body.get("label"));
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/dataset/{label}/filled")
    public ResponseEntity<Void> setDatasetFilled(@PathVariable String id, @PathVariable String label,
                                                 @RequestBody FilledRequest request) {
        statisticService.setDatasetFilled(id, label, Boolean.TRUE.equals(request.filled()));
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/dataset/{label}/color")
    public ResponseEntity<Void> setDatasetColor(@PathVariable String id, @PathVariable String label,
                                                @RequestBody ColorRequest request) {
        statisticService.setDatasetColor(id, label, request.color());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/dataset/{label}/smoothing")
    public ResponseEntity<Void> setDatasetSmoothing(@PathVariable String id, @PathVariable String label,
                                                    @RequestBody SmoothingRequest request) {
        if (request.smoothing() == null) {
            throw new ch.lonelyporter.statsapp.exception.InvalidDataPointException("Smoothing must be true or false");
        }
        statisticService.setDatasetSmoothing(id, label, request.smoothing());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/dataset/{label}/smoothing-window")
    public ResponseEntity<Void> setDatasetSmoothingWindow(@PathVariable String id, @PathVariable String label,
                                                          @RequestBody SmoothingWindowRequest request) {
        Double window = request.smoothingWindow();
        if (window == null || !Double.isFinite(window) || window < 1 || window > Integer.MAX_VALUE
                || window != Math.rint(window)) {
            throw new ch.lonelyporter.statsapp.exception.InvalidDataPointException("Smoothing window must be a positive whole number");
        }
        statisticService.setDatasetSmoothingWindow(id, label, window.intValue());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/title")
    public ResponseEntity<Void> renameStatistic(@PathVariable String id, @RequestBody TitleRequest request) {
        statisticService.renameStatistic(id, request.title());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/smoothing")
    public ResponseEntity<Void> setSmoothing(@PathVariable String id, @RequestBody SmoothingRequest request) {
        if (request.smoothing() == null) {
            throw new ch.lonelyporter.statsapp.exception.InvalidDataPointException("Smoothing must be true or false");
        }
        statisticService.setSmoothing(id, request.smoothing());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/chart-type")
    public ResponseEntity<Void> setChartType(@PathVariable String id, @RequestBody ChartTypeRequest request) {
        statisticService.setChartType(id, request.chartType());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/effort-comparison")
    public ResponseEntity<Void> setEffortComparison(@PathVariable String id, @RequestBody EffortComparisonRequest request) {
        if (request.effortComparison() == null) {
            throw new ch.lonelyporter.statsapp.exception.InvalidDataPointException("Effort comparison must be true or false");
        }
        statisticService.setEffortComparison(id, request.effortComparison());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/y-axis-format")
    public ResponseEntity<Void> setYAxisFormat(@PathVariable String id, @RequestBody YAxisFormatRequest request) {
        statisticService.setYAxisFormat(id, request.yAxisFormat());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/y-axis-bounds")
    public ResponseEntity<Void> setYAxisBounds(@PathVariable String id, @RequestBody YAxisBoundsRequest request) {
        statisticService.setYAxisBounds(id, request.yAxisMin(), request.yAxisMax());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/stacked")
    public ResponseEntity<Void> setStacked(@PathVariable String id, @RequestBody StackedRequest request) {
        if (request.stacked() == null) {
            throw new ch.lonelyporter.statsapp.exception.InvalidDataPointException("Stacked must be true or false");
        }
        statisticService.setStacked(id, request.stacked());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/axes")
    public ResponseEntity<Void> renameAxes(@PathVariable String id, @RequestBody Map<String, String> body) {
        statisticService.renameAxes(id, body.get("xAxisName"), body.get("yAxisName"), body.get("xAxisScaleType"), body.get("xAxisUnit"));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/datapoint")
    public ResponseEntity<Void> addDataPoint(@PathVariable String id, @RequestBody DataPointRequest request) {
        statisticService.addDataPoint(id, request.datasetLabel(), new Statistic.DataPoint(request.x(), request.y()));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/datapoint")
    public ResponseEntity<Void> deleteDataPoint(@PathVariable String id, @RequestBody DataPointRequest request) {
        statisticService.deleteDataPoint(id, request.datasetLabel(), new Statistic.DataPoint(request.x(), request.y()));
        return ResponseEntity.ok().build();
    }

    @PutMapping("/{id}/datasets/reorder")
    public ResponseEntity<Void> reorderDatasets(@PathVariable String id, @RequestBody List<String> orderedLabels) {
        statisticService.reorderDatasets(id, orderedLabels);
        return ResponseEntity.ok().build();
    }
}
