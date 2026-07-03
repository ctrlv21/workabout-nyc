# Workabout NYC

A black-glass interactive 3D map of laptop-friendly cafes in NYC.

## Local setup

1. Install dependencies:

   ```sh
   npm install
   ```

2. Create a local env file:

   ```sh
   cp .env.example .env.local
   ```

3. Add the required environment variables to `.env.local`:

   ```sh
   VITE_MAPBOX_TOKEN=pk.your_mapbox_public_token_here
   GOOGLE_PLACES_API_KEY=your_google_places_key
   ANTHROPIC_API_KEY=your_anthropic_key
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
   ```

4. Start the app:

   ```sh
   npm run dev
   ```

## Deploying to Vercel

Import this folder as a Vercel project. Vercel should detect Vite automatically, but `vercel.json` pins the build settings:

- Build command: `npm run build`
- Output directory: `dist`
- Public variables: `VITE_MAPBOX_TOKEN`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
- Server-only variables: `GOOGLE_PLACES_API_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`

Use a Mapbox public token that starts with `pk.`. The app shows a token setup message if the variable is missing.

## Community submissions

Run `supabase/schema.sql` once in the Supabase SQL Editor. Anonymous visitors can then submit workability
ratings. New submissions are private and marked `pending`; only approved submissions are publicly readable.

## Data

Cafe seed data lives in `src/cafes.ts`. Ratings, prices, noise, crowd, and coordinates are seed estimates to refine with firsthand visits.
