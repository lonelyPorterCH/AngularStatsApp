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
}
