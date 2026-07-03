import Anthropic from "@anthropic-ai/sdk";
import type { GooglePlace } from "./googlePlaces";

export type WorkabilityAnalysis = {
  score: number;
  confidence: "low" | "medium" | "high";
  verdict: string;
  evidence: string[];
  caveats: string[];
  model: string;
};

export async function analyzeWorkability(apiKey: string, place: GooglePlace): Promise<WorkabilityAnalysis> {
  const client = new Anthropic({ apiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
  const evidence = {
    name: place.name,
    address: place.address,
    publicRating: place.rating,
    publicRatingCount: place.ratingCount,
    priceLevel: place.priceLevel,
    hours: place.hours,
    googleReviewSummary: place.reviewSummary?.text ?? null,
    recentReviewExcerpts: place.reviews.slice(0, 5),
  };

  const message = await client.messages.create({
    model,
    max_tokens: 850,
    temperature: 0,
    system: `You score NYC cafes for laptop work. Judge only the supplied Google Places evidence.
Prioritize outlet availability, Wi-Fi reliability, seating comfort/capacity, noise, call suitability,
long-session tolerance, and food access. A high public star rating does not imply high workability.
Return only valid JSON with this exact shape:
{"score":number,"confidence":"low"|"medium"|"high","verdict":string,"evidence":string[],"caveats":string[]}
Score must be 1.0-5.0 with one decimal. Keep verdict under 22 words and each list to at most 4 concise items.
Use low confidence when work-specific evidence is sparse. Never invent amenities.`,
    messages: [{
      role: "user",
      content: `Analyze this cafe for working:\n${JSON.stringify(evidence)}`,
    }],
  });

  const text = message.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") throw new Error("Claude returned no text");
  const parsed = JSON.parse(text.text.replace(/^```json\s*|\s*```$/g, "")) as Omit<WorkabilityAnalysis, "model">;

  if (
    typeof parsed.score !== "number" ||
    parsed.score < 1 ||
    parsed.score > 5 ||
    !["low", "medium", "high"].includes(parsed.confidence) ||
    typeof parsed.verdict !== "string" ||
    !Array.isArray(parsed.evidence) ||
    !Array.isArray(parsed.caveats)
  ) {
    throw new Error("Claude returned an invalid workability analysis");
  }

  return {
    score: Math.round(parsed.score * 10) / 10,
    confidence: parsed.confidence,
    verdict: parsed.verdict,
    evidence: parsed.evidence.slice(0, 4),
    caveats: parsed.caveats.slice(0, 4),
    model,
  };
}
