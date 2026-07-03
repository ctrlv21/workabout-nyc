# Laptop-Friendly NYC — full build spec

A complete, self-contained brief for rebuilding the interactive map in Lovable, v0, Cursor, or similar. Paste the master prompt at the bottom, then the dataset. Everything needed is here.

---

## 1. What it is
A dark, blueprint-styled interactive guide to NYC cafes that are good for working on a laptop. Two panes: a 3D rotatable map of NYC on the right with a pin per cafe, and a details/filter panel on the left. Hovering a pin shows a quick card; clicking opens full details on the left. Curated and opinionated, not a scraped directory. Mobile-first and shareable.

## 2. Stack
- Map: **Mapbox GL JS v3** (the 3D buildings, rotation, and tilt come from here). Needs a free Mapbox public token (`pk.`...). In Lovable/v0, store it as an env variable or paste it into the map init.
- Framework: React + Tailwind is fine (Lovable/v0 default). A single static HTML file also works.
- Fonts via Google Fonts: **Fraunces** (serif display), **Inter** (body), **IBM Plex Mono** (technical labels).

## 3. Layout
- Desktop: CSS grid, two columns. Left panel fixed **390px**, right map fills the rest. Full viewport height, no page scroll, each pane scrolls independently.
- Mobile (max-width ~820px): stack to two rows. Map on top (~46vh), panel below.
- Left panel has two states that swap in place: **List view** (default) and **Detail view**.

## 4. Design system — dark blueprint
Exact palette (CSS variables):
```
--bg:        #0c131e   /* app background, deep blue-slate */
--panel:     #0e1622   /* left panel */
--card:      #13202f   /* popups, hover rows, controls */
--ink:       #e7eef7   /* primary text, soft blue-white */
--muted:     #8597ad   /* secondary text */
--accent:    #5da9ff   /* blueprint blue, primary accent */
--accent-2:  #7fc4ff   /* lighter blue, highlights */
--accent-soft: rgba(93,169,255,0.14)
--line:      rgba(125,165,210,0.18)  /* hairline borders */
--chip:      rgba(125,165,210,0.07)
--grid:      rgba(120,160,210,0.055) /* blueprint grid lines */
```
Rules that create the look:
- Left panel has a faint **blueprint grid background**: two repeating linear-gradients (horizontal + vertical lines) at 26px spacing in `--grid`.
- **Typography signals the style.** Fraunces serif for the wordmark and each cafe name (keeps it premium, not cold). IBM Plex Mono for all technical labels: the kicker, filter counts, spec field labels, ratings, tags, the back button. Inter for body and notes.
- Accent is used sparingly: pins, active chips, the score number, the rating bar (with a soft glow), links.
- Borders are thin bluish hairlines, never heavy shadows. Cards use `--card` with a `--line` border.
- Motion is subtle only: gentle pin hover-lift and scale, soft map fly transitions. Nothing bouncy.

## 5. Map
- Mapbox style `mapbox://styles/mapbox/standard`. On `style.load`, set the light preset to **night** so buildings render dark: `map.setConfigProperty('basemap','lightPreset','night')`.
- Initial camera: center `[-73.98, 40.745]`, zoom `11.6`, pitch `55`, bearing `-18`, antialias on.
- Add a NavigationControl (top-right) with `visualizePitch:true`. Style its buttons dark (`--card` bg, `--line` borders).
- User can drag to rotate, two-finger / right-drag to tilt.

### Markers (pins)
- One custom DOM marker per cafe, anchored at bottom. Teardrop pin shape (border-radius 50% 50% 50% 0, rotated -45deg) in `--accent`, with a soft blue ring + drop shadow. Inside, the cafe's working score (e.g. `4.8`) in mono, white, counter-rotated upright.
- Hover: lift and scale up slightly.
- Dimmed state (when filtered out): `opacity .28`, partial grayscale.
- Active state (currently open in detail): pin turns `--accent-2` with a stronger glow.

### Hover popup
On pin mouseenter, show a Mapbox popup (no close button) anchored to the pin with:
- Cafe name (Fraunces), neighborhood (mono, muted)
- Three rows: Working `X / 5`, Price `$$`, Coffee / food `$5 · Light`
- A small mono hint: "Click for full details"
Dark card styling: `--card` background, `--line` border, light text, and the popup tip colored to match `--card` for every anchor direction. Remove on mouseleave.

## 6. Interactions
- **Click a pin or a list row** opens Detail view on the left, marks that pin active, and `flyTo` it (zoom 14.5, pitch 58, ~1.1s).
- **Back button** in Detail returns to List view, clears the active pin, and flies back to the overview camera.
- **Filters** (see below) dim non-matching pins and rebuild the list. They do not remove pins from the map, just dim them.

## 7. List view (left panel default)
- Header: mono kicker ("NYC · field guide"), Fraunces H1 "Laptop-friendly NYC" (the "NYC" in italic accent), a one-line note.
- Sticky filter block:
  - Row 1: All / Manhattan / Brooklyn (borough, single-select, "All" resets).
  - Row 2: Outlets, Fast WiFi, Roomy, No time limit, Couches, Outdoor (attribute tags, multi-select).
- A mono count line ("12 spots", zero-padded).
- A scrollable list of rows: each shows cafe name (Fraunces) + neighborhood, and the working score on the right (mono, accent). Row hover highlights to `--card`. Click opens detail.

## 8. Detail view (left panel, after click)
In order:
- Back button (mono, uppercase).
- Cafe name (Fraunces, large), then `neighborhood · borough` (mono muted).
- Big working **score** (mono, accent) with "/ 5 for working", and a thin progress **bar** (score/5) with a blue gradient + glow.
- A price row, three columns: Price, Coffee, Food.
- A 2-column **specs grid**: Noise, Peak crowd, Seating, Charging, WiFi. Labels in mono accent uppercase, values in Inter.
- Attribute **tags** (mono, soft-blue pills).
- An "Open in Maps" button (accent fill) linking to a Google Maps search for the cafe.
- A small mono disclaimer that ratings/prices/noise/crowd are seed estimates to refine and coordinates are block-approximate.

## 9. Filter logic
A cafe is visible if: (no borough selected OR its borough matches) AND (it contains every selected tag). Selecting any borough/tag deselects "All"; clearing everything re-selects "All".

## 10. Data model
Each cafe: `n` (name), `h` (neighborhood), `b` (borough), `lng`, `lat`, `work` (0–5 working score), `price` ($/$$/$$$), `coffee` (price string), `food` (string), `noise`, `peak`, `seating`, `charging`, `wifi`, `t` (array of tags). Tags used for filtering: Outlets, Fast WiFi, Roomy, No time limit, Couches, Outdoor.

> Honest note: `work`, `price`, `coffee`, `noise`, `peak` are seed estimates and `lng`/`lat` are block-approximate. Replace with firsthand data. That accuracy is what makes it trustworthy and worth sharing.

## 11. Dataset (paste this as the cafes array)
```json
[
  {"n":"Bibliotheque","h":"East Village","b":"Manhattan","lng":-73.9842,"lat":40.7262,"work":4.8,"price":"$$","coffee":"$5","food":"Light bites","noise":"Low to medium","peak":"1-3pm weekends","seating":"Tables, power at each","charging":"Plenty","wifi":"Fast, handles calls","t":["Outlets","Fast WiFi","No time limit"]},
  {"n":"The Bean","h":"East Village","b":"Manhattan","lng":-73.9861,"lat":40.7291,"work":4.0,"price":"$$","coffee":"$4.50","food":"Pastries","noise":"Medium","peak":"12-2pm weekdays","seating":"Tables + counter","charging":"Some","wifi":"OK","t":["Outlets","Roomy"]},
  {"n":"787 Coffee","h":"East Village","b":"Manhattan","lng":-73.9822,"lat":40.7276,"work":4.2,"price":"$$","coffee":"$5","food":"Light","noise":"Medium","peak":"Afternoons","seating":"Tables, exposed brick","charging":"Plenty","wifi":"Fast","t":["Outlets","Fast WiFi"]},
  {"n":"Joe Coffee (LaGuardia Pl)","h":"Greenwich Village","b":"Manhattan","lng":-73.9981,"lat":40.7283,"work":3.9,"price":"$$","coffee":"$4.75","food":"Pastries","noise":"Medium","peak":"Mornings","seating":"Tables","charging":"Some","wifi":"OK","t":["Outlets"]},
  {"n":"Stumptown Coffee","h":"Greenwich Village","b":"Manhattan","lng":-73.9894,"lat":40.7312,"work":4.0,"price":"$$","coffee":"$5","food":"Pastries","noise":"Medium","peak":"Mornings","seating":"Limited tables","charging":"Scarce","wifi":"Fast","t":["Fast WiFi"]},
  {"n":"Ground Central","h":"Midtown","b":"Manhattan","lng":-73.9802,"lat":40.7541,"work":4.3,"price":"$$","coffee":"$5","food":"Light","noise":"Medium","peak":"Lunch","seating":"Couches + tables","charging":"Some","wifi":"Fast","t":["Couches","Fast WiFi"]},
  {"n":"Coffee Project NY","h":"Chelsea","b":"Manhattan","lng":-74.0031,"lat":40.7442,"work":4.1,"price":"$$","coffee":"$5.50","food":"Light","noise":"Low","peak":"Afternoons","seating":"Designed tables","charging":"Some","wifi":"Fast","t":["Roomy"]},
  {"n":"Telegraphe Cafe","h":"Chelsea","b":"Manhattan","lng":-74.0012,"lat":40.7461,"work":4.4,"price":"$$","coffee":"$4.75","food":"Pastries","noise":"Low","peak":"Flexible","seating":"Small tables","charging":"Some","wifi":"OK","t":["No time limit"]},
  {"n":"Variety Coffee","h":"Chelsea","b":"Manhattan","lng":-74.0003,"lat":40.7433,"work":3.8,"price":"$$","coffee":"$4.50","food":"Pastries","noise":"High","peak":"Most days, go early","seating":"Tables, busy","charging":"Scarce","wifi":"Fast","t":["Fast WiFi"]},
  {"n":"The Granola Bar","h":"Upper West Side","b":"Manhattan","lng":-73.9762,"lat":40.7871,"work":4.0,"price":"$$$","coffee":"$5","food":"Full menu","noise":"Medium","peak":"Brunch","seating":"Tables + booths","charging":"Some","wifi":"Fast","t":["Fast WiFi","Roomy"]},
  {"n":"Capital One Café","h":"Columbus Circle","b":"Manhattan","lng":-73.9821,"lat":40.7681,"work":4.5,"price":"$","coffee":"Free to $4","food":"Peet's cafe","noise":"Medium","peak":"Weekdays","seating":"Work areas, banquettes","charging":"Plenty","wifi":"Fast","t":["Outlets","No time limit"]},
  {"n":"Seven Grams Cafe","h":"Flatiron","b":"Manhattan","lng":-73.9901,"lat":40.7411,"work":3.9,"price":"$$","coffee":"$5","food":"Light","noise":"Medium","peak":"Mornings","seating":"Counter + tables","charging":"Some","wifi":"OK","t":["Outlets"]},
  {"n":"NBHD Brûlée","h":"Harlem","b":"Manhattan","lng":-73.9452,"lat":40.8101,"work":4.2,"price":"$$","coffee":"$5","food":"Pastries","noise":"Low","peak":"Afternoons","seating":"Tables + enclosed porch","charging":"Plenty","wifi":"Fast","t":["Outlets","Outdoor"]},
  {"n":"Partners Coffee","h":"Williamsburg","b":"Brooklyn","lng":-73.9571,"lat":40.7142,"work":4.1,"price":"$$","coffee":"$5","food":"Light","noise":"Medium","peak":"Weekends","seating":"Spacious tables","charging":"Some","wifi":"Fast","t":["Roomy"]},
  {"n":"K'Far (Hoxton lobby)","h":"Williamsburg","b":"Brooklyn","lng":-73.9611,"lat":40.7221,"work":4.3,"price":"$$$","coffee":"$5.50","food":"Full menu","noise":"Medium","peak":"Lunch","seating":"Lobby chairs + tables","charging":"Plenty","wifi":"Fast","t":["Outlets","Couches"]},
  {"n":"Odd Fox","h":"Greenpoint","b":"Brooklyn","lng":-73.9511,"lat":40.7301,"work":4.2,"price":"$$","coffee":"$5","food":"Pastries","noise":"Low","peak":"Mornings","seating":"Indoor + outdoor","charging":"Some","wifi":"Fast","t":["Outdoor","Roomy"]},
  {"n":"Hungry Ghost Coffee","h":"Fort Greene","b":"Brooklyn","lng":-73.9751,"lat":40.6891,"work":4.4,"price":"$$","coffee":"$4.75","food":"Light","noise":"Medium","peak":"Afternoons","seating":"Tables, couches, counter","charging":"Plenty","wifi":"Fast","t":["Outlets","Couches","Fast WiFi"]},
  {"n":"Devoción","h":"Williamsburg","b":"Brooklyn","lng":-73.9572,"lat":40.7152,"work":4.6,"price":"$$","coffee":"$5.50","food":"Light","noise":"Medium","peak":"Weekends","seating":"Tons of seating, skylight","charging":"Some","wifi":"Fast","t":["Roomy","Fast WiFi"]}
]
```

## 12. Later (do not build now)
Open-now hours, user submissions (needs a backend, e.g. Supabase in Lovable), save-favorites, neighborhood pages, a "best right now" sort, photos.

---

## 13. Master prompt to paste into Lovable / v0
> Build a premium, mobile-first web app: a dark, blueprint-styled interactive guide to NYC cafes that are good for working on a laptop. Two panes. Right pane: a 3D rotatable map of NYC using Mapbox GL JS v3 (style `mapbox/standard` with the `night` light preset so buildings are dark), initial pitch 55, bearing -18, zoom 11.6, centered on Manhattan; a custom teardrop pin per cafe in blueprint blue showing its working score. Hovering a pin shows a dark popup card with the cafe name, neighborhood, working rating out of 5, price, and coffee/food. Clicking a pin (or a list row) opens a detail view in the left pane and flies the map to it.
>
> Left pane, 390px on desktop, stacks below the map on mobile. Default state: a header with a monospace kicker and a Fraunces serif headline "Laptop-friendly NYC", a sticky filter bar with chips for borough (All, Manhattan, Brooklyn — single select) and attributes (Outlets, Fast WiFi, Roomy, No time limit, Couches, Outdoor — multi select), a result count, and a scrollable list of cafes (name + neighborhood + working score). Filters dim non-matching pins on the map and filter the list. Detail state: a back button, the cafe name, a large working score with a glowing progress bar, a price/coffee/food row, a 2-column spec grid (Noise, Peak crowd, Seating, Charging, WiFi), attribute tags, and an "Open in Maps" link.
>
> Design system, dark blueprint: background #0c131e, panel #0e1622, cards #13202f, text #e7eef7, muted #8597ad, accent blueprint-blue #5da9ff with #7fc4ff highlights. The left panel has a faint blueprint grid background (thin lines every 26px). Fonts: Fraunces serif for the wordmark and cafe names, IBM Plex Mono for all technical labels (kicker, counts, spec labels, ratings, tags), Inter for body. Thin bluish hairline borders, no heavy shadows, subtle motion only. Calm, confident, technical-but-elegant. I will paste the cafe data as a JSON array and a Mapbox public token.
