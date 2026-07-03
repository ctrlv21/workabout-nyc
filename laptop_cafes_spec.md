# Laptop-Friendly NYC — build spec

A one-page brief to paste into v0 or Lovable so the result looks premium, not generic. Timebox: one evening. This is a momentum and attention piece, not Scout.

## What it is
A curated, design-forward guide to NYC cafes that are genuinely good for working. Honest, opinionated, mobile-first. The angle is taste and trust: "a real person who works from cafes made this," not a scraped directory.

## Who it's for
Remote workers, students, freelancers, and the NYC tech/startup crowd. The same people you want noticing you on X.

## Core features (v1, keep it tight)
- A hero with a clear, confident one-liner. No stock-photo clutter.
- A responsive card grid of cafes. Each card: name, neighborhood, one honest sentence, attribute tags, and an "Open in Maps" link.
- Filter chips: borough (Manhattan, Brooklyn) and attributes (Outlets, Fast WiFi, Roomy, No time limit, Couches, Outdoor).
- A search box (filter by name or neighborhood).
- A short curator's note up top in your voice, so it reads as personal.
- Footer with your name and a link to your Substack/X.

## Nice to have later (do NOT build now)
- A map view (Mapbox or Google Maps) with pins.
- "Open now" using cafe hours.
- Let visitors submit a spot (this is where a Lovable + Supabase backend earns its place).
- Neighborhood pages, save-favorites, upvotes.

## Design direction (this is what kills the amateur look)
- Editorial and magazine-like. Think a design-forward city guide, generous whitespace, strong type hierarchy.
- Typography: a characterful serif for display (Fraunces, or similar), a clean grotesk for body (Inter). Big, confident headings.
- Color: warm and restrained. Off-white or cream base, ONE strong accent (a terracotta or a deep ink). Avoid the default Tailwind blue-and-gray palette, that is what reads as generic.
- Layout: mobile-first. Sticky filter bar. Cards with subtle borders, not heavy shadows.
- Motion: subtle only. Gentle hover lift, soft fade-in on load. Nothing bouncy or gimmicky.
- Imagery: optional. Real photos look premium but need upkeep. If unsure, skip photos and let type and color carry it. Consistency beats decoration.
- Overall feel: calm, confident, a little fashion-forward. It should look like something with a point of view.

## Paste-ready prompt for v0 / Lovable
> Build a premium, mobile-first single-page website: a curated guide to NYC cafes that are good for working on a laptop. Editorial, magazine-style design with generous whitespace and a strong type hierarchy. Use a characterful serif (like Fraunces) for headings and a clean sans (Inter) for body. Warm cream background, one restrained accent color (terracotta), subtle borders not heavy shadows, gentle hover and fade-in motion only. Sections: a confident hero with a one-line headline and a short personal note from the curator; a sticky filter bar with chips for borough (Manhattan, Brooklyn) and attributes (Outlets, Fast WiFi, Roomy, No time limit, Couches, Outdoor) plus a search box; a responsive grid of cafe cards. Each card shows the cafe name, neighborhood, one honest sentence, attribute tags, and an "Open in Maps" link. Footer with the curator's name and a link to her Substack. Avoid the default Tailwind blue/gray look; make it feel calm, confident, and a little fashion-forward. I will paste in the cafe data as a JSON array.

## Cafe data to paste in
Use the `CAFES` array from `laptop_cafes_nyc.html` as the starting dataset (18 real spots with neighborhood, note, and tags). Edit it first: add 2-3 of your own real favorites, cut any you don't rate. Your firsthand picks are what make it credible.
