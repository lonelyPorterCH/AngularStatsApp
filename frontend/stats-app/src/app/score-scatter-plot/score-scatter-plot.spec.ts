import {Score} from '../models/score';
import {selectLatestScoresBySongHash} from './score-scatter-plot';

describe('selectLatestScoresBySongHash', () => {
  const makeScore = (songHash: string, timeSet: string, accuracy: number, id: number): Score => ({
    songName: `Song ${songHash}`,
    levelAuthorName: 'Mapper',
    timeSetMillis: Date.parse(timeSet),
    accuracy,
    id,
    stars: 5,
    timeSet,
    songHash
  });

  it('selects only the latest score achieved on or before the selected date', () => {
    const january = makeScore('song-a', '2026-01-10T12:00:00Z', 69, 1);
    const march = makeScore('song-a', '2026-03-15T12:00:00Z', 72, 2);
    const scores = {player: [january, march]};

    expect(selectLatestScoresBySongHash(scores, '2026-03-15T11:59:59Z')['player']).toEqual([january]);
    expect(selectLatestScoresBySongHash(scores, '2026-03-15T12:00:00Z')['player']).toEqual([march]);
    expect(scores['player']).toEqual([january, march]);
  });

  it('keeps the latest eligible score for each distinct song hash', () => {
    const first = makeScore('song-a', '2026-01-10T12:00:00Z', 69, 1);
    const latest = makeScore('song-a', '2026-03-15T12:00:00Z', 72, 2);
    const otherSong = makeScore('song-b', '2026-02-01T12:00:00Z', 80, 3);

    expect(selectLatestScoresBySongHash({player: [first, otherSong, latest]}, '2026-03-15T12:00:00Z')['player'])
      .toEqual([latest, otherSong]);
  });

  it('selects scores separately for each player in comparison mode', () => {
    const playerOne = makeScore('song-a', '2026-02-01T12:00:00Z', 69, 1);
    const playerTwo = makeScore('song-a', '2026-02-02T12:00:00Z', 72, 2);

    expect(selectLatestScoresBySongHash({
      one: [playerOne],
      two: [playerTwo]
    }, '2026-02-03T00:00:00Z')).toEqual({
      one: [playerOne],
      two: [playerTwo]
    });
  });

  it('uses the higher score ID to break equal timestamp ties', () => {
    const lowerId = makeScore('song-a', '2026-02-01T12:00:00Z', 69, 1);
    const higherId = makeScore('song-a', '2026-02-01T12:00:00Z', 72, 2);

    expect(selectLatestScoresBySongHash({player: [higherId, lowerId]})['player']).toEqual([higherId]);
  });

  it('includes scores exactly on the selected-date boundary and excludes later scores', () => {
    const boundary = makeScore('song-a', '2026-02-01T12:00:00Z', 69, 1);
    const afterBoundary = makeScore('song-b', '2026-02-01T12:00:00.001Z', 72, 2);

    expect(selectLatestScoresBySongHash({player: [boundary, afterBoundary]}, boundary.timeSet)['player'])
      .toEqual([boundary]);
  });
});
