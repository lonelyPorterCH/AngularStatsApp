# ScoreSaber data flow and historical scores

## 1. Adding a player

The frontend calls `POST /api/scores/players/{playerId}`.
[PlayerService](src/main/java/ch/lonelyporter/statsapp/service/PlayerService.java):

1. Validates that the player ID contains 1 to 20 digits.
2. Checks whether the score repository already tracks the player. If so, it
   returns the player without importing the history again.
3. Fetches the player profile.
4. Fetches scores using `LocalDateTime.MIN` as the starting date, meaning there is
   no practical historical date cutoff on this initial import.
5. Saves the profile and appends the mapped scores to the score repository.

The profile and score saves are separate operations, not a transaction spanning
both files. An empty score history still creates a tracked player entry in the
score repository.

For example, the existing `players.json` associates player ID
`76561198091359540` with the name `lonelyPorter`. Its score history is stored in
`76561198091359540.json`.

## 2. Fetching pages from ScoreSaber

[ScoresConfiguration](src/main/java/ch/lonelyporter/statsapp/integration/scoresaber/ScoresConfiguration.java)
and [application.properties](src/main/resources/application.properties)
configure these defaults:

| Purpose      | Default                             |
|--------------|-------------------------------------|
| Base URL     | `https://scoresaber.com`            |
| Profile path | `/api/v2/players/{playerId}`        |
| Scores path  | `/api/v2/players/{playerId}/scores` |

These are configurable through `SCORESABER_BASE_URL`,
`SCORESABER_PLAYER_DETAILS_PATH`, and `SCORESABER_SCORES_PATH`.

[ScoresaberApiAdapter](src/main/java/ch/lonelyporter/statsapp/integration/scoresaber/ScoresaberApiAdapter.java)
starts at page 1 and requests `page`, `limit=100`, and `sort=recent`.
For lonelyPorter, the configured default request URL for the first score page is:

```text
https://scoresaber.com/api/v2/players/76561198091359540/scores?page=1&limit=100&sort=recent
```

This URL is derived from the implementation and the existing player ID; it is
not a recorded network request.

For each page, the adapter:

- Treats a null `data` list as empty.
- Keeps entries whose `score.createdAt`, converted to UTC local date-time, is
  strictly after the supplied starting date.
- Accumulates those entries.
- Continues only if every entry passed the date cutoff, the page was not empty,
  metadata is present, and the next page is within `metadata.totalPages`.

Thus, encountering an entry at or before the cutoff ends pagination after that
page. This relies on the requested recent-first ordering. Ranked filtering
happens later, during mapping, not during the pagination decision.

An empty response body causes an error. Profile HTTP 404 responses become an
empty optional; other HTTP failures propagate. Adding a player translates
`RestClientException` failures to HTTP 502 and a missing profile to HTTP 404.

## 3. Mapping API data into score events and leaderboard metadata

[PlayerScoresDto](src/main/java/ch/lonelyporter/statsapp/integration/scoresaber/PlayerScoresDto.java)
models both a nested API `score` and a nested `leaderboard`.
[ScoreMapper](src/main/java/ch/lonelyporter/statsapp/integration/scoresaber/ScoreMapper.java)
keeps only entries whose `leaderboard.realm.leaderboardStatus` is `RANKED`,
then creates a score event and its leaderboard metadata. The metadata is shared
by the `(leaderboardId, songHash)` pair; a song hash alone is not unique across
difficulties. Reads join those values into the existing API `Score` shape.

| Stored field      | Storage         | Source or transformation                                       |
|-------------------|-----------------|----------------------------------------------------------------|
| `leaderboardId`   | score event     | `leaderboard.id`, not the individual `score.id`                |
| `timeSetMillis`   | score event     | `score.createdAt.toEpochMilli()`                               |
| `timeSet`         | score event     | `score.createdAt` converted to UTC `LocalDateTime`             |
| `accuracy`        | score event     | Percentage conversion described below                          |
| `noFail`          | score event     | `score.mods` contains the exact `"NF"` modifier                |
| `songHash`        | event and cache | `leaderboard.map.hash`; paired with leaderboard ID             |
| `songName`        | leaderboard     | `leaderboard.map.songName`                                     |
| `levelAuthorName` | leaderboard     | `leaderboard.map.levelAuthorName`                              |
| `stars`           | leaderboard     | `leaderboard.realm.stars`                                      |
| `difficulty`      | leaderboard     | `{characteristic, name}` derived from `leaderboard.difficulty` |

`difficulty.difficulty` values 1, 3, 5, 7 and 9 map to `Easy`, `Normal`,
`Hard`, `Expert` and `ExpertPlus`. The `Solo` prefix is removed from
`difficulty.gameMode`, e.g. `SoloStandard` becomes `Standard` and
`SoloOneSaber` becomes `OneSaber`. Unsupported or missing API difficulty data
fails the import rather than guessing a playable difficulty.

Old leaderboard files without this field remain readable and return
`difficulty: null`. Normal score imports backfill difficulty for matching
leaderboards without changing cached stars; **Update everything** refreshes
stars and difficulty even if no new scores were added. Historical event files
do not change as part of metadata enrichment.

### Accuracy conversion

- If API accuracy is null, use `modifiedScore / maxScore * 100`.
- If it is at most 1, multiply it by 100.
- Otherwise, use it unchanged.

The original API accuracy and modified/max scores are not retained, so the
event JSON alone does not reveal which conversion branch produced its value.

Although the DTO includes the individual `score.id`, that value is not used as
a score-event ID or persisted. Existing player files store one event per
record, including repeated leaderboard IDs and repeated song hashes.

`timeSet` has no timezone suffix even though the backend derives it in UTC.
`timeSetMillis` is the epoch-millisecond representation of the same source instant.
The frontend currently parses `timeSet` for date filtering, so timezone handling
is worth preserving or explicitly correcting in any future timestamp migration.

## 4. Example Scores

A song/leaderboard is identified by the combination of `songHash` and
leaderboard `id`. One song can have multiple leaderboard IDs, one for each
difficulty. A player may also have multiple score events on the same
leaderboard; the event date and accuracy are retained independently.

Each API Score is composed from shared leaderboard information (`songName`,
`levelAuthorName`, `stars`, `songHash`, and `id`) and per-play score event
information (`accuracy`, `timeSet`, and `timeSetMillis`).

Below are the examples that make up the given 2 scores returned by the StatsApp API.

### Score Data

```json
[
  {
    "songName": "Toxic Violet Cubes",
    "levelAuthorName": "BSWC Team",
    "timeSetMillis": 1642615748000,
    "accuracy": 54.001504817548486,
    "id": 407243,
    "stars": 6.14,
    "timeSet": "2022-01-19T19:09:08",
    "songHash": "00DB999DD09E123C963B909B731E5D8AA0FA8B82"
  },
  {
    "songName": "Toxic Violet Cubes",
    "levelAuthorName": "BSWC Team",
    "timeSetMillis": 1650645378000,
    "accuracy": 61.29092435407145,
    "id": 407355,
    "stars": 4.65,
    "timeSet": "2022-04-22T18:36:18",
    "songHash": "00DB999DD09E123C963B909B731E5D8AA0FA8B82"
  }
]
```

### Leaderboard

Note: coverUrl & modifierValues were replaced with "..." for better readability

<table>
<thead>
<tr>
<th>Hard: leaderboard 407243</th>
<th>Normal: leaderboard 407355</th>
</tr>
</thead>
<tbody>
<tr>
<td><a href="https://scoresaber.com/api/v2/leaderboards/407243">Source JSON</a></td>
<td><a href="https://scoresaber.com/api/v2/leaderboards/407355">Source JSON</a></td>
</tr>
<tr>
<td valign="top"><pre><code class="language-json">
{
  "id": 407243,
  "map": {
    "id": 567,
    "hash": "00DB999DD09E123C963B909B731E5D8AA0FA8B82",
    "bsid": "1ad2b",
    "songName": "Toxic Violet Cubes",
    "songSubName": "",
    "songAuthorName": "Camellia",
    "levelAuthorName": "BSWC Team",
    "bpm": 265,
    "coverUrl": "...",
    "verified": true
  },
  "difficulty": {
    "id": 407243,
    "difficulty": 5,
    "gameMode": "SoloStandard",
    "rawDifficulty": "_Hard_SoloStandard"
  },
  "maxScore": 1641395,
  "legacyMaxScore": null,
  "totalScores": 2023,
  "dailyScores": 1,
  "createdAt": "2022-01-05T03:27:03.000Z",
  "realm": {
    "realmId": 1,
    "realmName": "Default",
    "leaderboardStatus": "RANKED",
    "positiveModifiers": false,
    "modifierValues": "...",
    "stars": 6.24,
    "rankedAt": "2022-01-16T21:07:14.000Z",
    "qualifiedAt": null,
    "lovedAt": null
  }
}
</code></pre></td>
<td valign="top"><pre><code class="language-json">
{
  "id": 407355,
  "map": {
    "id": 567,
    "hash": "00DB999DD09E123C963B909B731E5D8AA0FA8B82",
    "bsid": "1ad2b",
    "songName": "Toxic Violet Cubes",
    "songSubName": "",
    "songAuthorName": "Camellia",
    "levelAuthorName": "BSWC Team",
    "bpm": 265,
    "coverUrl": "...",
    "verified": true
  },
  "difficulty": {
    "id": 407355,
    "difficulty": 3,
    "gameMode": "SoloStandard",
    "rawDifficulty": "_Normal_SoloStandard"
  },
  "maxScore": 1232915,
  "legacyMaxScore": null,
  "totalScores": 1143,
  "dailyScores": 1,
  "createdAt": "2022-01-05T12:39:14.000Z",
  "realm": {
    "realmId": 1,
    "realmName": "Default",
    "leaderboardStatus": "RANKED",
    "positiveModifiers": false,
    "modifierValues": "...",
    "stars": 5.24,
    "rankedAt": "2022-01-16T21:07:12.000Z",
    "qualifiedAt": null,
    "lovedAt": null
  }
}
</code></pre></td>
</tr>
</tbody>
</table>

#### Achieved scores

<table>
<thead>
<tr>
<th>Hard: difficulty 5, leaderboard 407243</th>
<th>Normal: difficulty 3, leaderboard 407355</th>
</tr>
</thead>
<tbody>
<tr>
<td><a href="https://scoresaber.com/api/v2/players/76561198091359540/scores/hash/00DB999DD09E123C963B909B731E5D8AA0FA8B82/SoloStandard/5">Source JSON</a></td>
<td><a href="https://scoresaber.com/api/v2/players/76561198091359540/scores/hash/00DB999DD09E123C963B909B731E5D8AA0FA8B82/SoloStandard/3">Source JSON</a></td>
</tr>
<tr>
<td valign="top"><pre><code class="language-json">
{
  "id": 66160768,
  "rank": 1962,
  "unmodifiedScore": 886378,
  "modifiedScore": 443189,
  "accuracy": 0.5400150481754848,
  "pp": 21.5506,
  "weight": 3.640842783274703e-29,
  "mods": [
    "NF"
  ],
  "badCuts": 23,
  "missedNotes": 59,
  "maxCombo": 100,
  "fullCombo": false,
  "hasReplay": false,
  "personalBest": true,
  "legacyHmdId": 8,
  "version": null,
  "playOutcome": "CLEAR",
  "playOutcomeTime": null,
  "hasHistory": false,
  "createdAt": "2022-01-19T19:09:08.000Z",
  "player": {
    "id": "76561198091359540",
    "name": "lonelyPorter",
    "playerNameInGame": "lonelyPorter",
    "avatar": "https://cdn.scoresaber.com/avatars/76561198091359540.jpg",
    "avatarVersion": 1792940219,
    "country": "CH",
    "role": null,
    "permissions": 0
  },
  "device": null
}
</code></pre></td>
<td valign="top"><pre><code class="language-json">
{
  "id": 68898765,
  "rank": 1069,
  "unmodifiedScore": 755665,
  "modifiedScore": 755665,
  "accuracy": 0.6129092435407145,
  "pp": 63.2974,
  "weight": 1.260154367060553e-23,
  "mods": [],
  "badCuts": 28,
  "missedNotes": 22,
  "maxCombo": 198,
  "fullCombo": false,
  "hasReplay": false,
  "personalBest": true,
  "legacyHmdId": 8,
  "version": null,
  "playOutcome": "CLEAR",
  "playOutcomeTime": null,
  "hasHistory": false,
  "createdAt": "2022-04-22T18:36:18.000Z",
  "player": {
    "id": "76561198091359540",
    "name": "lonelyPorter",
    "playerNameInGame": "lonelyPorter",
    "avatar": "https://cdn.scoresaber.com/avatars/76561198091359540.jpg",
    "avatarVersion": 1792940219,
    "country": "CH",
    "role": null,
    "permissions": 0
  },
  "device": null
}
</code></pre></td>
</tr>
</tbody>
</table>

## 5. Updating tracked scores and leaderboard stars

The page provides two actions, both of which process every tracked player,
including players with empty score histories:

- **Update scores only** calls `POST /api/scores/players/scores/update` with
  `refreshLeaderboardStars: false`. It uses the existing recent-score
  pagination behavior and does not change cached stars.
- **Update everything** sends `refreshLeaderboardStars: true` and scans full
  player histories to refresh leaderboard stars as well as importing new
  scores.

For either mode, the backend:

1. Finds the maximum stored `timeSet`, or `LocalDateTime.MIN` if there are no
   scores.
2. Reads ScoreSaber pages. In **Update everything**, it reads through the final
   page; those pages include leaderboard metadata alongside score events,
   avoiding a separate request for each cached leaderboard.
3. Appends only ranked score events newer than the stored date.
4. In **Update everything**, collects current leaderboard metadata and refreshes
   stars for each cached `(leaderboardId, songHash)`, preserving the cached song
   name and mapper. The update fails explicitly if any cached leaderboard is
   absent from the returned player histories.

Score-page and player-profile requests are paced at a minimum 250 ms interval
(approximately four request starts per second). This is a conservative client
pace, not a guarantee of ScoreSaber's server-side rate limit. **Update
everything** reads all score pages for every tracked player, so its request
count scales with player score-history pages rather than with the number of
unique cached leaderboards. The UI shows one `<player>: N scores` line per
tracked player. Full updates also show `Leaderboards: changed/checked star
values changed.`

Repeated leaderboard IDs are retained as separate events when their date or
accuracy differs. Score reads and comparisons compose each event with the
current metadata cache. Refreshing leaderboard metadata changes names, mapper,
or stars in `leaderboards.json` only; it does not rewrite player event dates or
accuracies. Difficulty and game mode are not currently stored because no
application feature uses them. The UI's existing date-based latest-score
selection is unchanged.
