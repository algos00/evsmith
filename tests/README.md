# EVSmith tests

Regression tests for the built page, `../dist/EVSmith.html`. Nothing here ships with the app.

    npm install
    npm test                       # quick set, all files in parallel (about 3.5 s on 12 cores)
    npm run test:full              # everything, end-to-end in Chrome included (about 35 s on 12 cores)
    npm run test:e2e               # only the end-to-end checks
    npm run test:engine            # damage engine vs @smogon/calc (pinned to 0.12.0)
    npm run test:optimizer         # optimizer vs exhaustive search
    EVSMITH_HTML=/path/to/other.html npm test

* `compare-smogon.js` compares the damage engine with the independent `@smogon/calc` on random cases (abilities, items,
  status, boosts, weather, terrain, screens, Helping Hand, crits). Moves whose power or flags differ in Pokémon Champions
  (list at the top of the file) are skipped or counted as expected. One-point rounding differences when several stat
  modifiers stack (seen with Snow + Fur Coat and Hustle + Thick Fat; which rounding the real game follows is not verified) are
  tolerated up to 0.05% of the cases.
* `optimizer-bruteforce.js` compares the optimizer with an exhaustive search (every HP/Def/SpD combination, every subset of
  KO and Speed goals, every nature in "Auto" mode), including scenarios where not every goal can be met and Foul Play goals (which depend on your own Atk).
* `situational.js` compares the abilities that need a situation (Blaze-type at 1/3 HP, Flash Fire, Stakeout, Electromorphosis, Supreme Overlord, Merciless) with `@smogon/calc`.
* `features.js` checks the Resistance mode by exhaustive search of the split, the "why these points" pins, Foul Play and Sand Spit.
* `app-logic.js` tests the pure functions of the interface: saved state, share link and Showdown export.
* `contrast.js` checks the WCAG contrast of the colour tokens, light and dark.
* `i18n.js` checks that every interface text has an Italian translation with the same placeholders and HTML tags, and that no translation is unused.
* `e2e.js` drives the built page in a real Chrome (puppeteer-core; `CHROME_PATH` or a normal install) on a local server with no network: keyboard use, full calculation, import, share link, layout at 10 widths, accessibility names, Italian interface, offline mode.

The quick set uses fewer random cases and one seed, and leaves out the "every nature" optimizer scenarios and the end-to-end checks.

`run-all.js` runs the checks as a queue of processes (slowest first, one per core), and splits the optimizer search into parts
(`optimizer-bruteforce.js seed scenarios autoScenarios k/n`: only every n-th scenario starting at k is solved; the scenarios
themselves are the same). The end-to-end checks run after the others, never alongside them: on a busy machine the page timings
become too slow to be reliable. The reference search in `optimizer-bruteforce.js` computes damage once per defensive value and
checks that it does not depend on the HP points (it fails with "damage depends on HP points" otherwise), which keeps it exhaustive.
Timings and the history of what was sped up are in `../AGENTS.md`.

If a test fails, `run-all.js` prints the exact command: rerun that file alone with the same arguments to reproduce the case.
