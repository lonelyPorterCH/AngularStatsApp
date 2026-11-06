import {Score} from '../models/score';
import {selectLatestScoresBySongAndLeaderboard} from './score-scatter-plot';

describe('selectLatestScoresBySongAndLeaderboard', () => {
  const makeScore = (
    songHash: string,
    timeSet: string,
    accuracy: number,
    leaderboardId: number = 1
  ): Score => ({
    songName: `Song ${songHash}`,
    levelAuthorName: 'Mapper',
    timeSetMillis: Date.parse(timeSet),
    accuracy,
    leaderboardId,
    stars: 5,
    timeSet,
    songHash
  });

  it('selects only the latest score achieved on or before the selected date', () => {
    const january = makeScore('song-a', '2026-01-10T12:00:00Z', 69);
    const march = makeScore('song-a', '2026-03-15T12:00:00Z', 72);
    const scores = {player: [january, march]};

    expect(selectLatestScoresBySongAndLeaderboard(scores, '2026-03-15T11:59:59Z')['player']).toEqual([january]);
    expect(selectLatestScoresBySongAndLeaderboard(scores, '2026-03-15T12:00:00Z')['player']).toEqual([march]);
    expect(scores['player']).toEqual([january, march]);
  });

  it('keeps the latest eligible score for each distinct song and leaderboard', () => {
    const first = makeScore('song-a', '2026-01-10T12:00:00Z', 69);
    const latest = makeScore('song-a', '2026-03-15T12:00:00Z', 72);
    const otherSong = makeScore('song-b', '2026-02-01T12:00:00Z', 80, 3);

    expect(selectLatestScoresBySongAndLeaderboard({player: [first, otherSong, latest]}, '2026-03-15T12:00:00Z')['player'])
      .toEqual([latest, otherSong]);
  });

  it('keeps the latest score separately for each leaderboard of the same song', () => {
    const easyEarlier = makeScore('song-a', '2026-01-10T12:00:00Z', 69, 101);
    const easyLatest = makeScore('song-a', '2026-03-15T12:00:00Z', 72, 101);
    const expertLatest = makeScore('song-a', '2026-02-20T12:00:00Z', 80, 202);

    expect(selectLatestScoresBySongAndLeaderboard({player: [easyEarlier, expertLatest, easyLatest]})['player'])
      .toEqual([easyLatest, expertLatest]);
  });

  it('selects scores separately for each player in comparison mode', () => {
    const playerOne = makeScore('song-a', '2026-02-01T12:00:00Z', 69, 1);
    const playerTwo = makeScore('song-a', '2026-02-02T12:00:00Z', 72, 2);

    expect(selectLatestScoresBySongAndLeaderboard({
      one: [playerOne],
      two: [playerTwo]
    }, '2026-02-03T00:00:00Z')).toEqual({
      one: [playerOne],
      two: [playerTwo]
    });
  });

  it('keeps the first score when timestamps are equal for a leaderboard', () => {
    const first = makeScore('song-a', '2026-02-01T12:00:00Z', 69);
    const later = makeScore('song-a', '2026-02-01T12:00:00Z', 72);

    expect(selectLatestScoresBySongAndLeaderboard({player: [first, later]})['player']).toEqual([first]);
  });

  it('includes scores exactly on the selected-date boundary and excludes later scores', () => {
    const boundary = makeScore('song-a', '2026-02-01T12:00:00Z', 69, 1);
    const afterBoundary = makeScore('song-b', '2026-02-01T12:00:00.001Z', 72, 2);

    expect(selectLatestScoresBySongAndLeaderboard({player: [boundary, afterBoundary]}, boundary.timeSet)['player'])
      .toEqual([boundary]);
  });
});
