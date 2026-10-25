package ch.lonelyporter.statsapp.service;

import ch.lonelyporter.statsapp.scores.Score;
import ch.lonelyporter.statsapp.scores.ScoreRepository;
import ch.lonelyporter.statsapp.scoresaber.ScoresaberApiAdapter;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class ScoreService {
    private final ScoreRepository scoreRepository;
    private final ScoresaberApiAdapter apiAdapter;

    public ScoreService(ScoreRepository scoreRepository, ScoresaberApiAdapter apiAdapter) {
        this.scoreRepository = scoreRepository;
        this.apiAdapter = apiAdapter;
    }

    public List<Score> getScores(String playerId) {
        return scoreRepository.loadScores(playerId);
    }

    public Map<String, List<Score>> compare(String playerOneId, String playerTwoId) {
        Map<String, List<Score>> scores = new HashMap<>();
        scores.put(playerOneId, getScores(playerOneId));
        scores.put(playerTwoId, getScores(playerTwoId));
        return scores;
    }

    public int updateScores(String playerId) {
        LocalDateTime startDate = scoreRepository.mostRecentScoreDate(playerId).orElse(LocalDateTime.MIN);
        List<Score> scores = apiAdapter.loadScoresStarting(playerId, startDate);
        scoreRepository.addScores(scores, playerId);
        return scores.size();
    }
}
