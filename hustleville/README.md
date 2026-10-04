# Hustleville

Business & life age-up simulator. Open `index.html` in a browser (no build step).

## Loop
Tap **AGE** to pass a year. Everything you did during the year resolves on age-up: job pay, business profit and loss, deals, investments, upkeep, random events and the death check.

## Business hubs
Each business is a small simulation you run during the year, then age-up turns the state of the hub into a P&L. Starting is one tap (online businesses are free). The immersive contract desk now appears only when you sell. The action-point (energy) limit is off for now: set `ENERGY_ON = true` at the top of `hubs.js` to bring it back.
- **Dropshipping store**: find products, run ads, optimize conversion, negotiate with suppliers, handle support.
- **Nightclub**: book acts, throw themed nights, hire staff, keep safety, cleanliness and the licence in order, set door and drink prices.
- **Creator agency** (subscription platform, adult creators, non-explicit): scout, pitch fair offers (creators can say no), plan content, protect and look after creators.
- Each hub has "Take a call" roleplays with branching choices.

## Social media and celebrity
Posting is a lottery: most posts do little, some go viral, a few break out, and some backfire. Brand deals appear as you grow. At 1M followers the Celebrity chapter opens: entourage, tours, merch, awards, paparazzi and scandals.

## Files
- `data.js`: countries, jobs, contract trap clauses, assets, crimes, activities
- `hubs.js`: the three business hubs and their roleplays
- `social.js`: social media, deals, celebrity chapter
- `game.js`: state, age-up engine, panels, contract-signing desk
- `styles.css`, `index.html`: UI
- `assets/`: logo, wordmark, Runway art. `design/mockups/`: Runway layout references
- `garage.js`: the car Garage — widebody kits, 14 paints (gloss/matte), 3 anime itasha wraps, headlight colours and underglow neons, rendered live on a canvas from Runway sprites in `assets/garage/` (`<car>-stock|wide.webp`, `*-pm.png` paint maps, `meta.json` lamp positions)

## More modules
`casino.js` (roulette, blackjack, sports betting), `breathe.js`, `gym.js`, `heist.js`, `scam.js` (mini games), `wardrobe.js` (fashion brands + fitting room). See `CLAUDE.md` for architecture and the art pipeline (`tools/`).

## Play locally
1. Download or clone this branch and open the `hustleville` folder.
2. Mac/Linux: run `./play.sh` — Windows: double-click `play.bat` (needs Python 3). Or run `python3 -m http.server 8000` there.
3. Open http://localhost:8000 in your browser.

A local server is needed (instead of double-clicking index.html) so the Garage can recolor the car images.
