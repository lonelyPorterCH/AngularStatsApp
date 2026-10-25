package ch.lonelyporter.statsapp.scores.scoresaber;

import ch.lonelyporter.statsapp.scores.domain.Score;

import java.time.ZoneOffset;
import java.util.List;

final class ScoreMapper {
    private ScoreMapper() {
    }

    static List<Score> map(List<PlayerScoresDto.PlayerScore> playerScores) {
        return playerScores.stream()
                .filter(score -> "RANKED".equals(score.leaderboard().realm().leaderboardStatus()))
                .map(ScoreMapper::map)
                .toList();
    }

    private static Score map(PlayerScoresDto.PlayerScore playerScore) {
        var score = playerScore.score();
        var leaderboard = playerScore.leaderboard();
        var map = leaderboard.map();
        var timeSet = score.createdAt().atOffset(ZoneOffset.UTC).toLocalDateTime();
        return new Score(map.songName(), map.levelAuthorName(), score.createdAt().toEpochMilli(),
                toPercentage(score.accuracy(), score.modifiedScore(), leaderboard.maxScore()),
                leaderboard.id(), leaderboard.realm().stars(), timeSet, map.hash());
    }

    private static double toPercentage(Double accuracy, long modifiedScore, int maxScore) {
        if (accuracy == null) {
            return (double) modifiedScore / maxScore * 100;
        }
        return accuracy <= 1 ? accuracy * 100 : accuracy;
    }
}
