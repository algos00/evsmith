# tools

`build-hero.js` bundles `src/hero/hero.src.js` with three.js into `src/hero/hero.js` (needs `npm install --prefix tools` once;
the output is committed). `update-meta.js` refreshes `src/tdata.js` (tournament usage and sets) from MunchStats' public JSON
(data from Limitless TCG). It waits 10 s between requests (the site's robots.txt crawl-delay), sends no personal data,
and caches the answers in `tools/.cache/`.

    node tools/update-meta.js --top 60       # about 11 minutes for 60 Pokémon
    node tools/update-meta.js --cached       # rebuild from the cache, no network
    npm run build                            # then rebuild the app

`update-teams.js` builds `src/teamdata.js` (which Pokémon are used together, overall and by team type) from the full team
lists of [Limitless TCG](https://docs.limitlesstcg.com/developer)'s public tournament API, optionally adding
[Pokedata](https://www.pokedata.ovh) standings of official events. Only counts are written, no player names.

    node tools/update-teams.js                       # Reg M-C, last 30 days, 25+ players, 2 s between requests
    node tools/update-teams.js --pokedata ID,ID      # also add official events (you choose the ids; regulation not checked)
    node tools/update-teams.js --pokedata-file f.json
    node tools/update-teams.js --cached              # rebuild from the cache, no network

The team list format was taken from other open-source tools that read these services, not from official documentation:
check the output of the first runs. It refuses to write the file with fewer than 200 teams or with more than 5% unknown
Pokémon. Neither service states clear terms for redistributing aggregated data: ask them before publishing it.

For `update-meta.js`, check the result: names missing from `src/data.js` are dropped and listed at the end of the run.
The data is only as fresh as your last run: the app shows the collection date in the footer.
