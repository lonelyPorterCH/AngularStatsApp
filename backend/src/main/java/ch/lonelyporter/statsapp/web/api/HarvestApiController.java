package ch.lonelyporter.statsapp.web.api;

import ch.lonelyporter.statsapp.service.HarvestService;
import ch.lonelyporter.statsapp.web.model.HarvestView;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/harvest")
public class HarvestApiController {
    private final HarvestService harvestService;

    public record PlantRequest(String name) {
    }

    public record HarvestRequest(LocalDate date, int quantity) {
    }

    @GetMapping("/years")
    public ResponseEntity<List<Integer>> getYears() {
        return ResponseEntity.ok(harvestService.getYears());
    }

    @GetMapping("/{year}")
    public ResponseEntity<HarvestView> getSeason(@PathVariable int year) {
        return ResponseEntity.ok(harvestService.getSeason(year));
    }

    @PostMapping("/{year}/plants")
    public ResponseEntity<Void> addPlant(@PathVariable int year, @RequestBody PlantRequest request) {
        harvestService.addPlant(year, request.name());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{year}/plants/{plantId}")
    public ResponseEntity<Void> renamePlant(@PathVariable int year, @PathVariable String plantId,
                                            @RequestBody PlantRequest request) {
        harvestService.renamePlant(year, plantId, request.name());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{year}/plants/{plantId}")
    public ResponseEntity<Void> deletePlant(@PathVariable int year, @PathVariable String plantId) {
        harvestService.deletePlant(year, plantId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{year}/plants/{plantId}/harvests")
    public ResponseEntity<Void> addHarvest(@PathVariable int year, @PathVariable String plantId,
                                           @RequestBody HarvestRequest request) {
        harvestService.addHarvest(year, plantId, request.date(), request.quantity());
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{year}/plants/{plantId}/harvests/{harvestId}")
    public ResponseEntity<Void> updateHarvest(@PathVariable int year, @PathVariable String plantId,
                                              @PathVariable String harvestId, @RequestBody HarvestRequest request) {
        harvestService.updateHarvest(year, plantId, harvestId, request.date(), request.quantity());
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{year}/plants/{plantId}/harvests/{harvestId}")
    public ResponseEntity<Void> deleteHarvest(@PathVariable int year, @PathVariable String plantId,
                                              @PathVariable String harvestId) {
        harvestService.deleteHarvest(year, plantId, harvestId);
        return ResponseEntity.ok().build();
    }
}
