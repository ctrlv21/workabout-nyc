import { createClient } from "@supabase/supabase-js";
import type { GooglePlace } from "./googlePlaces";
import type { WorkabilityAnalysis } from "./workability";

export async function saveWorkabilityAnalysis(place: GooglePlace, analysis: WorkabilityAnalysis) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return false;

  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await supabase.from("workability_analyses").upsert({
    google_place_id: place.id,
    cafe_name: place.name,
    analysis,
    source_rating_count: place.ratingCount,
    analyzed_at: new Date().toISOString(),
  });
  if (error) throw error;
  return true;
}
