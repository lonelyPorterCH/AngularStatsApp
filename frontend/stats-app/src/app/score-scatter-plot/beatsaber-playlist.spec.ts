import {Score} from '../models/score';
import {buildBeatSaberPlaylist} from './beatsaber-playlist';

const score = (overrides: Partial<Score> = {}): Score => ({
  songName: 'Song',
  levelAuthorName: 'Mapper',
  songHash: 'a'.repeat(40),
  leaderboardId: 1,
  stars: 5,
  accuracy: 90,
  timeSet: '2026-01-01T12:00:00Z',
  timeSetMillis: Date.parse('2026-01-01T12:00:00Z'),
  difficulty: {characteristic: 'Standard', name: 'Normal'},
  ...overrides
});

describe('Beat Saber playlist export', () => {
  it('exports the example playlist structure and combines difficulties for the same hash', () => {
    const playlist = buildBeatSaberPlaylist([
      score(),
      score({leaderboardId: 2, songHash: 'A'.repeat(40), difficulty: {characteristic: 'Standard', name: 'ExpertPlus'}}),
      score({leaderboardId: 3, difficulty: {characteristic: 'OneSaber', name: 'Normal'}}),
      score()
    ], 'Player');
    expect(playlist).toEqual({
      playlistTitle: 'StatsApp selection',
      playlistAuthor: 'Player',
      songs: [{
        songName: 'Song',
        levelAuthorName: 'Mapper',
        hash: 'A'.repeat(40),
        levelid: `custom_level_${'A'.repeat(40)}`,
        difficulties: [
          {characteristic: 'Standard', name: 'Normal'},
          {characteristic: 'Standard', name: 'ExpertPlus'},
          {characteristic: 'OneSaber', name: 'Normal'}
        ]
      }]
    });
  });

  it('keeps different maps separate and does not mutate source scores', () => {
    const scores = [score(), score({songHash: 'b'.repeat(40)})];
    const original = JSON.stringify(scores);
    const playlist = buildBeatSaberPlaylist(scores, 'Player');
    expect(playlist.songs).toHaveLength(2);
    playlist.songs[0].difficulties[0].name = 'Hard';
    expect(JSON.stringify(scores)).toBe(original);
  });

  it('rejects empty selection, invalid hashes and missing metadata without exporting a partial playlist', () => {
    expect(() => buildBeatSaberPlaylist([], 'Player')).toThrow('Select at least one');
    expect(() => buildBeatSaberPlaylist([score({songHash: 'invalid'})], 'Player')).toThrow('invalid song hash');
    expect(() => buildBeatSaberPlaylist([score(), score({difficulty: null})], 'Player')).toThrow('missing difficulty');
    expect(() => buildBeatSaberPlaylist([score({difficulty: undefined})], 'Player')).toThrow('missing difficulty');
  });
});
