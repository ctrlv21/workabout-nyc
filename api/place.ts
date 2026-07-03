import { findGooglePlace } from "../server/googlePlaces.js";

export default async function handler(request: any, response: any) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return response.status(503).json({ error: "Places API is not configured." });

  const name = String(request.query.name ?? "");
  const lat = Number(request.query.lat);
  const lng = Number(request.query.lng);
  if (!name || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return response.status(400).json({ error: "Missing place name or coordinates." });
  }

  try {
    const place = await findGooglePlace(apiKey, { name, lat, lng });
    if (!place) return response.status(404).json({ error: "Place not found." });
    response.setHeader("Cache-Control", "no-store");
    return response.status(200).json(place);
  } catch (error) {
    console.error(error);
    return response.status(502).json({ error: "Google Places could not be reached." });
  }
}
