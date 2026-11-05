Frontend:

- atm the most recent score per songhash is returned, instead, it should be the most recent score per songHash &
  leaderboardId (difficulty)

Backend:

- update leaderboard when updating scores, stars might have changed
- Don't keep everything in cache, just calculate it as needed.
- Migrate from json to a SQLite DB?

If you are an Agent, ignore this File, its only notes for me, the owner of this project, you don't need to implement
anything, or add anything to this file