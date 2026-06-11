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

    record DataPointRequest(String datasetLabel, String x, String y) {
    }

    record FilledRequest(Boolean filled) {
    }

    @GetMapping
    public ResponseEntity<List<Statistic>> getStatistics() {
        log.debug("GET /api/stats");
        return ResponseEntity.ok(statisticService.getStatistics());
    }

    @PostMapping
    public ResponseEntity<Void> createStatistic(@RequestBody Statistic statistic) {
        statisticService.createStatistic(statistic);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    public ResponseEntity<Statistic> getStatisticById(@PathVariable String id) {
        log.debug("GET /api/stats/{}", id);
        return ResponseEntity.ok(statisticService.getStatisticById(id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStatisticById(@PathVariable String id) {
        log.debug("DELETE /api/stats/{}", id);
        statisticService.deleteStatisticById(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/dataset")
    public ResponseEntity<Void> addDataset(@PathVariable String id, @RequestBody Map<String, String> body) {
        log.debug("POST /api/stats/{}/dataset. Label: {}", id, body.get("label"));
        statisticService.addDataset(id, body.get("label"));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/dataset/{label}")
    public ResponseEntity<Void> deleteDataset(@PathVariable String id, @PathVariable String label) {
        log.debug("DELETE /api/stats/{}/dataset/{}", id, label);
        statisticService.deleteDataset(id, label);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/dataset/{label}")
    public ResponseEntity<Void> renameDataset(@PathVariable String id, @PathVariable String label,
                                              @RequestBody Map<String, String> body) {
        log.debug("PATCH /api/stats/{}/dataset/{} -> {}", id, label, body.get("label"));
        statisticService.renameDataset(id, label, body.get("label"));
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/dataset/{label}/filled")
    public ResponseEntity<Void> setDatasetFilled(@PathVariable String id, @PathVariable String label,
                                                 @RequestBody FilledRequest request) {
        log.debug("PATCH /api/stats/{}/dataset/{}/filled -> {}", id, label, request.filled());
        statisticService.setDatasetFilled(id, label, Boolean.TRUE.equals(request.filled()));
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}/axes")
    public ResponseEntity<Void> renameAxes(@PathVariable String id, @RequestBody Map<String, String> body) {
        log.debug("PATCH /api/stats/{}/axes", id);
        statisticService.renameAxes(id, body.get("xAxisName"), body.get("yAxisName"));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/datapoint")
    public ResponseEntity<Void> addDataPoint(@PathVariable String id, @RequestBody DataPointRequest request) {
        log.debug("POST /api/stats/{}/datapoint. Dataset: {}, Point ({}, {})", id, request.datasetLabel(), request.x(), request.y());
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
        log.debug("PUT /api/stats/{}/datasets/reorder", id);
        statisticService.reorderDatasets(id, orderedLabels);
        return ResponseEntity.ok().build();
    }
}
