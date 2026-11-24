# Changelog

All notable changes to EVSmith. Versions follow the Git tags (`vX.Y.Z`).

## 1.5.0

- New optimizer: an exhaustive search over every spread (max 32 per stat, 66 points) with a proven result, replacing the old greedy one.
- Two modes: **Minimum points** (as before) and **Perfect spread** (uses the points for the best margins: Recovery and other HP Optimizations first, then every calculation balanced so the weakest margin is lifted first, then the stat your nature raises lands on a bump).
- Your goals are now a priority list: drag the handle or use the ↑ ↓ buttons. The first goal counts most; if not everything fits, the ones lower in the list are given up first and the result shows which are met. Old saves and links keep working (their Required / Important / Nice to have order is converted).
- Survive goals have a “Your Def boost” and “Your SpD boost”.
- Helping Hand is only counted when ticked in the goal's “Field, Weather & Multiplicator” box (the box on KO goals is gone); otherwise you only get the hint that it would give the KO.
- Tournament meta: a new option to knock out (or deal a share of the HP of) the most used Pokémon with the moves of your KO goals, with an assumed bulk; the meta is capped at 60 goals.
- “HP Optimizations” (renamed, ordered by importance).
- Fix: Parental Bond's second hit is now 25% of the base damage before the damage rolls, as in the game (it was off by a point in many cases).

## 1.4.1

- 3D hero: the model is smaller so it no longer overflows, and the hero uses `dvh` so it fits Safari's moving toolbar.

## 1.4.0

- 3D hero: a full-screen, draggable (mouse, touch, arrow keys) Garchomp model at the top of the page when it is served from GitHub Pages and WebGL works; otherwise the normal header stays.

## 1.3.0

- Italian interface (🌐 button), chosen automatically from the browser language the first time and remembered.
- Import a Pokémon Showdown set, and “Check my spread” to test the points you already have without optimizing.
- Keyboard use and screen readers: the Pokémon/move suggestions work with arrows, Enter and Esc; every field has a name; type-coloured buttons keep readable contrast.
- Installable app with offline cache when served from GitHub Pages; header pictures load after the page.
- Development: quick tests in about 5 s, full tests with end-to-end checks in Chrome for CI and releases; weekly workflow that proposes tournament data updates as a pull request.

## 1.2.0

- Pokémon pictures from PokéAPI, hexagon chart of the spread, new type-coloured look.

## 1.1.0

- Extra HP optimizations (Leftovers, Sitrus Berry, Life Orb, Substitute, poison and more).

## 1.0.0

- First public release.
