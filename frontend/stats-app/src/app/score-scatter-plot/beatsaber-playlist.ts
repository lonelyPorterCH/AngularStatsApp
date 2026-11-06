import {Score, SongDifficulty} from '../models/score';

interface PlaylistSong {
  songName: string;
  levelAuthorName: string;
  hash: string;
  levelid: string;
  difficulties: SongDifficulty[];
}

export function buildBeatSaberPlaylist(scores: Score[], author: string) {
  if (!scores.length) {
    throw new Error('Select at least one song before exporting.');
  }
  const songs = new Map<string, PlaylistSong>();
  for (const score of scores) {
    if (!/^[a-f0-9]{40}$/i.test(score.songHash)) {
      throw new Error(`"${score.songName}" has an invalid song hash and cannot be exported.`);
    }
    const difficulty = score.difficulty;
    if (!difficulty?.characteristic?.trim()
      || !['Easy', 'Normal', 'Hard', 'Expert', 'ExpertPlus'].includes(difficulty.name)) {
      throw new Error(`"${score.songName}" is missing difficulty information. Update everything or migrate the leaderboard data before exporting.`);
    }
    const hash = score.songHash.toUpperCase();
    let song = songs.get(hash);
    if (!song) {
      song = {
        songName: score.songName,
        levelAuthorName: score.levelAuthorName,
        hash,
        levelid: `custom_level_${hash}`,
        difficulties: []
      };
      songs.set(hash, song);
    }
    if (!song.difficulties.some(item => item.characteristic === difficulty.characteristic && item.name === difficulty.name)) {
      song.difficulties.push({...difficulty});
    }
  }
  return {
    playlistTitle: 'StatsApp selection',
    playlistAuthor: author,
    songs: [...songs.values()]
  };
}
