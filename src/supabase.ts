import { createClient } from "@supabase/supabase-js";
import type { WorkabilityAnalysis } from "../server/workability";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabase = url && anonKey
  ? createClient(url, anonKey, {
      auth: { persistSession: false },
    })
  : null;

export type CommunitySubmission = {
  cafe_key: string;
  cafe_name: string;
  google_place_id: string | null;
  neighborhood: string;
  borough: string;
  outlets: string;
  seating: string;
  noise: string;
  calls: string;
  notes: string | null;
  contributor_id: string;
};

export async function submitCommunityRating(submission: CommunitySubmission) {
  if (!supabase) throw new Error("Supabase is not configured");

  const { error } = await supabase.from("workability_submissions").insert(submission);
  if (error) throw error;
}

export async function fetchStoredWorkability(placeIds: string[]) {
  if (!supabase || placeIds.length === 0) return new Map<string, WorkabilityAnalysis>();
  const { data, error } = await supabase
    .from("workability_analyses")
    .select("google_place_id, analysis")
    .in("google_place_id", placeIds);
  if (error) throw error;

  return new Map(
    (data ?? []).map((row) => [row.google_place_id as string, row.analysis as WorkabilityAnalysis]),
  );
}
