package ch.lonelyporter.statsapp.web.api;

import ch.lonelyporter.statsapp.service.StatisticService;
import ch.lonelyporter.statsapp.web.model.Statistic;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/stats")
public class StatsApiController {

    private final StatisticService statisticService;

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
    public ResponseEntity<Statistic> deleteStatisticById(@PathVariable String id) {
        log.debug("DELETE /api/stats/{}", id);
        statisticService.deleteStatisticById(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/datapoint")
    public ResponseEntity<Void> addDataPoint(@PathVariable String id,
                                             @RequestBody Statistic.DataPoint dataPoint) {
        log.debug("POST /api/stats/{}/datapoint. Datapoint ({}, {})", id, dataPoint.getX(), dataPoint.getY());
        statisticService.addDataPoint(id, dataPoint);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}/datapoint")
    public ResponseEntity<Void> deleteDataPoint(@PathVariable String id,
                                                @RequestBody Statistic.DataPoint dataPoint) {
        statisticService.deleteDataPoint(id, dataPoint);
        return ResponseEntity.ok().build();
    }
}
