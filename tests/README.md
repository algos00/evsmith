# EVSmith tests

Regression tests for the built page, `../dist/EVSmith.html`. Nothing here ships with the app.

    npm install
    npm test                       # quick set, all files in parallel (about 3.5 s on 12 cores)
    npm run test:full              # everything: more random cases, two seeds (about 15 s on 12 cores)
    npm run test:engine            # damage engine vs @smogon/calc (pinned to 0.12.0)
    npm run test:optimizer         # optimizer vs exhaustive search
    EVSMITH_HTML=/path/to/other.html npm test

* `compare-smogon.js` compares the damage engine with the independent `@smogon/calc` on random cases (abilities, items,
  status, boosts, weather, terrain, screens, Helping Hand, crits). Moves whose power or flags differ in Pokémon Champions
  (list at the top of the file) are skipped or counted as expected. One-point rounding differences when several stat
  modifiers stack (seen with Snow + Fur Coat and Hustle + Thick Fat; which rounding the real game follows is not verified) are
  tolerated up to 0.05% of the cases.
* `optimizer-bruteforce.js` compares the optimizer, in both modes, with an exhaustive search that calls the engine on every full spread (no tables, no
  split into blocks): random scenarios with 1-4 goals (Survive incl. Foul Play, joined hits and Def boosts, KO incl. Helping Hand in the field, Speed),
  fixed or "Auto" nature, locked stats, a point limit of 10 or 66 with three or four stats locked (keeps the search exhaustive and fast), and HP
  Optimizations. The reference ranks spreads by the vector described in the file header and in `../AGENTS.md`; the spread the optimizer returns must
  have the same vector and the same number of points as the best one found.
* `regression.js`: the Mega Floette case (Survive Dire Claw + two KOs at +1 with Helping Hand). "Minimum points" gives 10 HP / 29 Def / 21 SpA; "Perfect spread" must use more points, take less
  damage from Dire Claw with every KO still met, and be the best of all 30,977 HP/Def/SpA spreads (checked by calling the engine on each).
* `situational.js` compares the abilities that need a situation (Blaze-type at 1/3 HP, Flash Fire, Stakeout, Electromorphosis, Supreme Overlord, Merciless) with `@smogon/calc`.
* `weather.js` checks every weather (none, Sun, Rain, Sand, Snow) on moves of nine types against Rock, Ice and other defenders, plus explicit ×1.5 / ×0.5 expectations, Cloud Nine / Air Lock, weather set by abilities, Weather Ball, Solar Beam, Sand Force, Solar Power, Mega Sol (compared with the same attack under Sun, since @smogon/calc does not know it), the speed abilities, Forecast and Skill Link, then about 50 damage abilities as attacker and defender on random moves, each also required to change damage at least once. Zero differences are tolerated. Parental Bond is not compared on moves that lower the user's stats (Overheat, Leaf Storm...): @smogon/calc lowers them between the two hits, EVSmith does not.
* `features.js` checks the Resistance mode by exhaustive search of the split, the "why these points" pins, Foul Play and Sand Spit.
* `app-logic.js` tests the pure functions of the interface: saved state, share link and Showdown export, the order of the goal list (blocks, moves, old saves), the real `metaGoals` code (with a stubbed page) and the Mega Floette share link from the issue (Perfect spread keeps Recovery and beats the old spreads).
* `contrast.js` checks the WCAG contrast of the colour tokens, light and dark.
* `i18n.js` checks that every interface text has an Italian translation with the same placeholders and HTML tags, and that no translation is unused.

The quick set uses fewer random cases and one seed.

`run-all.js` runs the checks as a queue of processes (slowest first, one per core), and splits the optimizer search into parts
(`optimizer-bruteforce.js seed scenarios autoScenarios k/n`: only every n-th scenario starting at k is solved; the scenarios
themselves are the same). The end-to-end checks run after the others, never alongside them: on a busy machine the page timings
become too slow to be reliable. The reference search in `optimizer-bruteforce.js` computes damage once per defensive value and
checks that it does not depend on the HP points (it fails with "damage depends on HP points" otherwise), which keeps it exhaustive.
Timings and the history of what was sped up are in `../AGENTS.md`.

If a test fails, `run-all.js` prints the exact command: rerun that file alone with the same arguments to reproduce the case.

There are no browser (end-to-end) tests: they were removed on 2026-11-19 as not worth their time. Layout, accessibility names, the Italian interface in the real page and the 3D hero are therefore checked by hand.
