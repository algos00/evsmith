# EVSmith tests

Regression tests for `../EVSmith.html`. Nothing here ships with the app.

    npm install
    npm test                       # everything (about a minute)
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

If a test fails, rerun it with the same seed to reproduce the exact case.
