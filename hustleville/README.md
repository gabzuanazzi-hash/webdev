# Hustleville

Business & life age-up simulator. Open `index.html` in a browser (no build step).

## Loop
Tap **AGE** to pass a year. Everything you did during the year resolves on age-up: job pay, business profit and loss, deals, investments, upkeep, random events and the death check.

## Business hubs (action points)
Each business is a small simulation. You get action points (AP) per year to run it, then age-up turns the state of the hub into a P&L. Starting one opens the contract desk.
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
