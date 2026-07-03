import { findNearbyCafes } from "../server/googlePlaces.js";

export default async function handler(_request: any, response: any) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) return response.status(503).json({ error: "Places API is not configured." });

  try {
    const cafes = await findNearbyCafes(apiKey);
    response.setHeader("Cache-Control", "public, s-maxage=86400, stale-while-revalidate=604800");
    return response.status(200).json(cafes);
  } catch (error) {
    console.error(error);
    return response.status(502).json({ error: "Nearby cafes could not be loaded." });
  }
}
