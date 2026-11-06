package ch.lonelyporter.statsapp.domain.scores;

import java.util.List;

public record ScoreUpdateSummary(List<PlayerScoreUpdate> players, boolean leaderboardStarsRefreshed,
                                 int leaderboardsChanged, int leaderboardsChecked) {
}
