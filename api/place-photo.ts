import { getGooglePhotoUrl } from "../server/googlePlaces.js";

export default async function handler(request: any, response: any) {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  const name = String(request.query.name ?? "");
  if (!apiKey || !name.startsWith("places/")) return response.status(400).end();

  try {
    const photoUrl = await getGooglePhotoUrl(apiKey, name);
    if (!photoUrl) return response.status(404).end();
    response.setHeader("Cache-Control", "private, max-age=1800");
    return response.redirect(302, photoUrl);
  } catch (error) {
    console.error(error);
    return response.status(502).end();
  }
}
