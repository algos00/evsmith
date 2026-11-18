# tools

`update-meta.js` refreshes `src/tdata.js` (tournament usage and sets) from MunchStats' public JSON
(data from Limitless TCG). It waits 10 s between requests (the site's robots.txt crawl-delay), sends no personal data,
and caches the answers in `tools/.cache/`.

    node tools/update-meta.js --top 60       # about 11 minutes for 60 Pokémon
    node tools/update-meta.js --cached       # rebuild from the cache, no network
    npm run build                            # then rebuild the app

Check the result: names missing from `src/data.js` are dropped and listed at the end of the run.
The data is only as fresh as your last run: the app shows the collection date in the footer.
