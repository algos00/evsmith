# EVSmith

Tell EVSmith what your Pokémon must **survive**, **KO** and **outspeed**, and it builds the 66-point Stat Point spread that does it, either with the fewest points ("Minimum points") or using all of them for the best margins ("Perfect spread"). Goals are ranked by their order in the list, which you can change by dragging or with the arrow buttons. For Pokémon Champions (level 50, doubles, VGC).

It is a single HTML file with no server and no tracking.

> **Unofficial fan project.** Not affiliated with, sponsored by or endorsed by Nintendo, Game Freak, Creatures Inc. or The Pokémon Company. Pokémon and all related names are trademarks of their respective owners.

## Use it

- **Online:** https://algos00.github.io/evsmith/ (installable, and usable offline after the first visit).
- **Offline file:** download `EVSmith-vX.Y.Z.html` from the [latest release](../../releases/latest) and open it in a browser.

A usage guide is built into the page ("How to use EVSmith").

## What it does

- Survive, KO and Speed goals with priorities; weather, terrain, screens, Tailwind, Helping Hand and more per goal.
- Tries every nature, or the one you choose; keeps the points you want fixed.
- For KO goals, shows the minimum points **with and without Helping Hand**.
- Optional tournament-meta goals: survive the most used attacks, outspeed the most used Pokémon, and knock out (or take a share of the HP of) the most used Pokémon with your own KO moves.
- Explains which goal needs each point, and can spend leftover points for the best resistance or to tune the HP stat (Leftovers, Sitrus Berry, Life Orb, Substitute, poison…).
- Optional tournament meta (usage and sets from online Limitless tournaments).
- Pokémon pictures, a hexagon chart of the spread, and a type-coloured theme for light and dark mode.
- Share a setup as a link; import a Showdown set and check it ("Check my spread"), or export the result to Showdown.
- English and Italian interface (🌐 button; English by default). Game names stay in English, as in Showdown.
- Works with keyboard and screen readers.

## Teambuilding

The home screen leads to two tools: **EV Builder** (everything above) and **Teambuilding**.

- Build a team of up to six sets, as in Pokémon Showdown (item, ability, nature, moves, Stat Points); import and export it as Showdown text. Keep several teams, each with its own name; they are saved in your browser.
- Once the team has a Pokémon, get suggested partners, each with a short reason.
- The score combines tournament teammates and usage (about 44%), shared weaknesses and coverage (37%) and missing moves (19%). For coverage, a partner only counts its attacks of its own types. The score measures fit, not the chance to win.
- Teammate data comes from tournament team lists (`tools/update-teams.js`). Until it has been collected, suggestions use overall usage, types and moves.

## How it is checked

The damage engine is compared with [`@smogon/calc`](https://github.com/smogon/damage-calc) on random cases, and the optimizer with an exhaustive search; the page itself is not covered by automatic browser tests. See [`tests/README.md`](tests/README.md). Results are still estimates for planning: always test a spread in battle.

## Develop

Requires Node.js 20 or newer.

```
npm ci --prefix tests     # test dependencies (once)
npm run build             # writes dist/EVSmith.html
npm test                  # build + quick checks (a few seconds): use it while developing
npm run test:full         # build + every check (about 15 s on 12 cores)
```

Edit the files in `src/`, never `dist/`. How the code is organized, how to refresh the data, the test details and the release procedure are in [`AGENTS.md`](AGENTS.md). Changes are listed in [`CHANGELOG.md`](CHANGELOG.md).

## Data and licenses

- **Pictures:** Pokémon sprites and artwork are **not** stored in this repository. The page loads them at runtime from the [PokéAPI sprites](https://github.com/PokeAPI/sprites) repository (hosted by GitHub). They belong to Nintendo, Game Freak and The Pokémon Company and are not covered by the MIT license.
- **3D model** (header, only when the page is served online): “Garchomp” by [Icefer547](https://sketchfab.com/Icefer547) on [Sketchfab](https://sketchfab.com/3d-models/garchomp-dcb3101f15bb409d88c154e33dbcb118), [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/); textures reduced to 1024 px and converted to WebP. It *is* stored in this repository (`src/hero/garchomp.glb`). The character is © Nintendo, Game Freak and The Pokémon Company and is not covered by that license or by the MIT license. Shown with [three.js](https://threejs.org) (MIT).
- **Code:** MIT, see [`LICENSE`](LICENSE).
- **Game data:** generated from the public data of [Pokémon Showdown](https://github.com/smogon/pokemon-showdown) (MIT; notice included in the built page).
- **Tournament usage and sets:** [MunchStats](https://www.munchstats.com) (data from Limitless TCG).
