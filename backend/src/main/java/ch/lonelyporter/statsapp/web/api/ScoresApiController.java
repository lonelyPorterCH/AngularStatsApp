package ch.lonelyporter.statsapp.web.api;

import ch.lonelyporter.statsapp.domain.scores.Player;
import ch.lonelyporter.statsapp.domain.scores.Score;
import ch.lonelyporter.statsapp.service.PlayerService;
import ch.lonelyporter.statsapp.service.ScoreService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/scores")
public class ScoresApiController {
    private final ScoreService scoreService;
    private final PlayerService playerService;

    public ScoresApiController(ScoreService scoreService, PlayerService playerService) {
        this.scoreService = scoreService;
        this.playerService = playerService;
    }

    @GetMapping("/players")
    public List<String> getPlayerIds() {
        return playerService.getAllPlayerIds();
    }

    @GetMapping("/players/details")
    public List<Player> getPlayers() {
        return playerService.getAllPlayers();
    }

    @GetMapping("/players/{playerId}")
    public Player getPlayer(@PathVariable String playerId) {
        return playerService.getPlayer(playerId);
    }

    @PostMapping("/players/{playerId}")
    public Player addPlayer(@PathVariable String playerId) {
        return playerService.addPlayer(playerId);
    }

    @GetMapping("/players/{playerId}/scores")
    public List<Score> getScores(@PathVariable String playerId) {
        return scoreService.getScores(playerId);
    }

    @GetMapping("/players/{playerId}/scores/compare/{otherPlayerId}")
    public Map<String, List<Score>> compareScores(@PathVariable String playerId,
                                                   @PathVariable String otherPlayerId) {
        return scoreService.compare(playerId, otherPlayerId);
    }

    @PostMapping("/players/{playerId}/scores/update")
    public ResponseEntity<Integer> updateScores(@PathVariable String playerId) {
        int updatedScores = scoreService.updateScores(playerId);
        playerService.updatePlayers();
        return ResponseEntity.ok(updatedScores);
    }
}
