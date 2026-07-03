import { findMenuInsights } from "../server/menuInsights.js";

export default async function handler(request: any, response: any) {
  if (request.method !== "POST") return response.status(405).json({ error: "Method not allowed." });
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return response.status(503).json({ error: "Claude is not configured." });
  const name = String(request.body?.name ?? "");
  const website = String(request.body?.website ?? "");
  if (!name || !website) return response.status(400).json({ error: "Missing cafe or website." });

  try {
    const insights = await findMenuInsights(apiKey, { name, website });
    response.setHeader("Cache-Control", "private, max-age=3600");
    return response.status(200).json(insights);
  } catch (error) {
    console.error(error);
    return response.status(200).json({
      status: "unavailable",
      priceRange: null,
      items: [],
      menuUrl: website,
      note: "The official menu could not be read.",
    });
  }
}
