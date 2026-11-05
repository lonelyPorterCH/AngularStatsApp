package ch.lonelyporter.statsapp.integration.scoresaber;

import ch.lonelyporter.statsapp.domain.scores.LeaderboardMetadata;
import ch.lonelyporter.statsapp.domain.scores.ScoreEvent;
import ch.lonelyporter.statsapp.domain.scores.ScoreRecord;

import java.time.ZoneOffset;
import java.util.List;

final class ScoreMapper {
    private ScoreMapper() {
    }

    static List<ScoreRecord> map(List<PlayerScoresDto.PlayerScore> playerScores) {
        return playerScores.stream()
                .filter(score -> "RANKED".equals(score.leaderboard().realm().leaderboardStatus()))
                .map(ScoreMapper::map)
                .toList();
    }

    private static ScoreRecord map(PlayerScoresDto.PlayerScore playerScore) {
        var score = playerScore.score();
        var leaderboard = playerScore.leaderboard();
        var map = leaderboard.map();
        var timeSet = score.createdAt().atOffset(ZoneOffset.UTC).toLocalDateTime();
        var metadata = new LeaderboardMetadata(leaderboard.id(), map.hash(), map.songName(),
                map.levelAuthorName(), leaderboard.realm().stars());
        var event = new ScoreEvent(leaderboard.id(), timeSet, score.createdAt().toEpochMilli(),
                toPercentage(score.accuracy(), score.modifiedScore(), leaderboard.maxScore()), map.hash());
        return new ScoreRecord(event, metadata);
    }

    private static double toPercentage(Double accuracy, long modifiedScore, int maxScore) {
        if (accuracy == null) {
            return (double) modifiedScore / maxScore * 100;
        }
        return accuracy <= 1 ? accuracy * 100 : accuracy;
    }
}
