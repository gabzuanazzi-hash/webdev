# Hustleville — working notes for Claude

Vanilla HTML/CSS/JS life + business simulator. **No build step, no dependencies.** Serve the folder over HTTP (`./play.sh` or `python3 -m http.server 8000`); the Garage/Wardrobe read image pixels on a canvas, so `file://` will not work.

## Files (load order in index.html)
data.js (countries, jobs, ASSETS shop data, CRIMES, ACTIVITIES + ACT_GROUPS) → hubs.js (business hubs) → social.js (social/celebrity, Boost tab) → garage.js (car customisation, canvas compositing) → casino.js (roulette, blackjack, sports) → breathe.js (meditation mini game) → gym.js (guided workout) → heist.js (lock pick + showcase) → wardrobe.js (fashion brands, fitting room) → scam.js (phone scam call) → game.js (state `S`, UI, age-up engine, panels, action table `A`).

## Conventions
- State is one object `S`, saved to localStorage (`save()`); `refresh()` re-renders the HUD and open panel; `say(icon, text, cls)` writes to the life feed.
- UI buttons use `data-a="<action>" data-v="<value>"`; one delegated click handler calls `A[action](value, el)`. New modules export an actions object (`CASINO_ACTS`, `WARDROBE_ACTS`) merged into `A` at the bottom of game.js.
- Mini games are full-screen overlays (`.brx`) that call back with a result; crimes with games (`heist`, `scam`) go through `A.crime`, skipping falls back to the dice roll.
- Luck/karma: `luckAdj()`, `lk(p, w)`, `addKarma(n)` in game.js; luck fades yearly, meditation/charity raise it, crime lowers karma.
- Energy system is off (`ENERGY_ON = false` in hubs.js). No grooming/coercion mechanics — keep it that way.

## Art pipeline (assets are generated images, then processed offline)
- `assets/avatars/<name>.webp`: 4x2 atlas of 192px cells = life stages (baby, kid, teen, young adult / adult, old, celebrity, ghost). Ghost is the original ghost in every atlas; baby is a recolour of the original baby layout. Built by `tools/avatar_atlas_build.py`.
- `assets/wardrobe/body-<name>.webp` full-body (400x716); `g-<item>.webp` garment layers cut to the shared woman/man template bodies (so they fit all characters of that body type); `g-<item>@<name>.webp` are skin-tinted variants for layers that show skin; `t-<item>.webp` thumbnails. Scripts: `tools/garment_extract.py` (diff against base), `tools/wardrobe_export.py`, `tools/wardrobe_skin_variants.py`. They expect the source PNGs next to them (not committed).
- `assets/garage/`: car sprites `<key>-stock|wide.webp`, paint masks `*-pm.png` (R shading, G body mask), `meta.json` (lamp + wheel ellipses), `wheels.webp`, wraps. Wrap area is cleaned at runtime by `wrapMask()` in garage.js.
- Runway was used for image generation (nano-banana-2 works with reference images at ~7 credits per image).

## Adding things
- New shop item: add to `ASSETS` in data.js. New clothing: add to `WARDROBE` in wardrobe.js plus its layer file. New activity: add to `ACTIVITIES` with `grp`/`fx`; hook a mini game in `A.fun`.
