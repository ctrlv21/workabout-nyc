import { analyzeWorkability } from "../server/workability.js";
import type { GooglePlace } from "../server/googlePlaces.js";
import { saveWorkabilityAnalysis } from "../server/workabilityCache.js";

export default async function handler(request: any, response: any) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed." });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return response.status(503).json({ error: "Claude is not configured." });

  try {
    const place = request.body as GooglePlace;
    const analysis = await analyzeWorkability(apiKey, place);
    await saveWorkabilityAnalysis(place, analysis);
    response.setHeader("Cache-Control", "private, max-age=3600");
    return response.status(200).json(analysis);
  } catch (error) {
    console.error(error);
    return response.status(502).json({ error: "Claude could not analyze this cafe." });
  }
}
