package ch.lonelyporter.statsapp.integration.scoresaber;

import ch.lonelyporter.statsapp.domain.scores.LeaderboardMetadata;
import ch.lonelyporter.statsapp.domain.scores.ScoreEvent;
import ch.lonelyporter.statsapp.domain.scores.ScoreRecord;
import ch.lonelyporter.statsapp.domain.scores.SongDifficulty;
import ch.lonelyporter.statsapp.domain.scores.TopScore;

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

    static List<LeaderboardMetadata> mapLeaderboards(List<PlayerScoresDto.PlayerScore> playerScores) {
        return playerScores.stream()
                .map(PlayerScoresDto.PlayerScore::leaderboard)
                .map(ScoreMapper::mapLeaderboard)
                .toList();
    }

    static TopScore mapTopScore(PlayerScoresDto.PlayerScore playerScore) {
        if (playerScore == null || playerScore.score() == null || playerScore.leaderboard() == null) {
            throw new IllegalArgumentException("ScoreSaber omitted a top score or its leaderboard");
        }
        var score = playerScore.score();
        var leaderboard = playerScore.leaderboard();
        double accuracy = toPercentage(score.accuracy(), score.modifiedScore(), leaderboard.maxScore());
        if (score.createdAt() == null || leaderboard.map() == null || leaderboard.map().hash() == null
                || !Double.isFinite(accuracy)) {
            throw new IllegalArgumentException("ScoreSaber returned an invalid top score");
        }
        return new TopScore(leaderboard.id(), leaderboard.map().hash(),
                score.createdAt().atOffset(ZoneOffset.UTC).toLocalDateTime(), accuracy);
    }

    static LeaderboardMetadata mapLeaderboard(PlayerScoresDto.Leaderboard leaderboard) {
        var map = leaderboard.map();
        return new LeaderboardMetadata(leaderboard.id(), map.hash(), map.songName(),
                map.levelAuthorName(), leaderboard.realm().stars(), mapDifficulty(leaderboard.difficulty()));
    }

    static SongDifficulty mapDifficulty(PlayerScoresDto.Difficulty difficulty) {
        if (difficulty == null || difficulty.gameMode() == null
                || !difficulty.gameMode().startsWith("Solo") || difficulty.gameMode().length() == 4) {
            throw new IllegalArgumentException("ScoreSaber omitted a supported song characteristic");
        }
        String name = switch (difficulty.difficulty()) {
            case 1 -> "Easy";
            case 3 -> "Normal";
            case 5 -> "Hard";
            case 7 -> "Expert";
            case 9 -> "ExpertPlus";
            default -> throw new IllegalArgumentException("Unknown ScoreSaber difficulty: " + difficulty.difficulty());
        };
        return new SongDifficulty(difficulty.gameMode().substring(4), name);
    }

    private static ScoreRecord map(PlayerScoresDto.PlayerScore playerScore) {
        var score = playerScore.score();
        var leaderboard = playerScore.leaderboard();
        var timeSet = score.createdAt().atOffset(ZoneOffset.UTC).toLocalDateTime();
        var metadata = mapLeaderboard(leaderboard);
        var event = new ScoreEvent(leaderboard.id(), timeSet, score.createdAt().toEpochMilli(),
                toPercentage(score.accuracy(), score.modifiedScore(), leaderboard.maxScore()), metadata.songHash(),
                mapNoFail(score.mods()));
        return new ScoreRecord(event, metadata);
    }

    static boolean mapNoFail(List<String> mods) {
        if (mods == null || mods.stream().anyMatch(java.util.Objects::isNull)) {
            throw new IllegalArgumentException("ScoreSaber omitted valid score modifiers");
        }
        return mods.contains("NF");
    }

    private static double toPercentage(Double accuracy, long modifiedScore, int maxScore) {
        if (accuracy == null) {
            return (double) modifiedScore / maxScore * 100;
        }
        return accuracy <= 1 ? accuracy * 100 : accuracy;
    }
}
