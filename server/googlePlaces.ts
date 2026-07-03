export type GooglePlace = {
  id: string;
  name: string;
  address: string;
  rating: number | null;
  ratingCount: number | null;
  priceLevel: string | null;
  openNow: boolean | null;
  hours: string[];
  website: string | null;
  mapsUrl: string | null;
  photoName: string | null;
  reviews: Array<{
    text: string;
    rating: number | null;
    relativeTime: string;
  }>;
  reviewSummary: {
    text: string;
    disclosureText: string;
    reviewsUri: string;
    flagContentUri: string;
  } | null;
};

export type GoogleCafeSummary = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  mapsUrl: string | null;
  openNow: boolean | null;
  neighborhood: string;
  borough: "Manhattan" | "Brooklyn";
};

export async function findNearbyCafes(apiKey: string): Promise<GoogleCafeSummary[]> {
  const centers = [
    { neighborhood: "Midtown", borough: "Manhattan" as const, latitude: 40.754, longitude: -73.984 },
    { neighborhood: "Chelsea", borough: "Manhattan" as const, latitude: 40.744, longitude: -74.001 },
    { neighborhood: "East Village", borough: "Manhattan" as const, latitude: 40.729, longitude: -73.985 },
    { neighborhood: "SoHo", borough: "Manhattan" as const, latitude: 40.7233, longitude: -74.0007 },
    { neighborhood: "UWS", borough: "Manhattan" as const, latitude: 40.783, longitude: -73.978 },
    { neighborhood: "Harlem", borough: "Manhattan" as const, latitude: 40.8116, longitude: -73.9448 },
    { neighborhood: "Williamsburg", borough: "Brooklyn" as const, latitude: 40.7152, longitude: -73.958 },
    { neighborhood: "Greenpoint", borough: "Brooklyn" as const, latitude: 40.7305, longitude: -73.9544 },
    { neighborhood: "Bushwick", borough: "Brooklyn" as const, latitude: 40.7025, longitude: -73.9213 },
    { neighborhood: "Fort Greene", borough: "Brooklyn" as const, latitude: 40.6918, longitude: -73.9754 },
    { neighborhood: "Downtown BK", borough: "Brooklyn" as const, latitude: 40.6935, longitude: -73.9857 },
  ];
  const batches = await Promise.all(
    centers.map(async (center) => {
      const response = await fetch("https://places.googleapis.com/v1/places:searchNearby", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": [
            "places.id",
            "places.displayName",
            "places.formattedAddress",
            "places.location",
            "places.googleMapsUri",
            "places.currentOpeningHours.openNow",
          ].join(","),
        },
        body: JSON.stringify({
          includedPrimaryTypes: ["cafe", "coffee_shop"],
          maxResultCount: 12,
          rankPreference: "POPULARITY",
          locationRestriction: {
            circle: {
              center: { latitude: center.latitude, longitude: center.longitude },
              radius: 1700,
            },
          },
        }),
      });
      if (!response.ok) throw new Error(`Google nearby search failed (${response.status})`);
      const payload = (await response.json()) as {
        places?: Array<{
          id: string;
          displayName?: { text?: string };
          formattedAddress?: string;
          location?: { latitude?: number; longitude?: number };
          googleMapsUri?: string;
          currentOpeningHours?: { openNow?: boolean };
        }>;
      };
      return (payload.places ?? []).map((place) => ({ place, center }));
    }),
  );

  const unique = new Map<string, GoogleCafeSummary>();
  const distanceById = new Map<string, number>();
  for (const { place, center } of batches.flat()) {
    const lat = place.location?.latitude;
    const lng = place.location?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") continue;
    const distance = (lat - center.latitude) ** 2 + (lng - center.longitude) ** 2;
    if ((distanceById.get(place.id) ?? Number.POSITIVE_INFINITY) <= distance) continue;
    distanceById.set(place.id, distance);
    unique.set(place.id, {
      id: place.id,
      name: place.displayName?.text ?? "Cafe",
      address: place.formattedAddress ?? "",
      lat,
      lng,
      mapsUrl: place.googleMapsUri ?? null,
      openNow: place.currentOpeningHours?.openNow ?? null,
      neighborhood: center.neighborhood,
      borough: center.borough,
    });
  }
  const cafes = [...unique.values()];
  return cafes;
}

export async function findGooglePlace(
  apiKey: string,
  query: { name: string; lat: number; lng: number },
): Promise<GooglePlace | null> {
  const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": [
        "places.id",
        "places.displayName",
        "places.formattedAddress",
        "places.rating",
        "places.userRatingCount",
        "places.priceLevel",
        "places.currentOpeningHours",
        "places.regularOpeningHours",
        "places.websiteUri",
        "places.googleMapsUri",
        "places.photos",
        "places.reviews",
        "places.reviewSummary",
      ].join(","),
    },
    body: JSON.stringify({
      textQuery: `${query.name}, New York, NY`,
      maxResultCount: 1,
      locationBias: {
        circle: {
          center: { latitude: query.lat, longitude: query.lng },
          radius: 600,
        },
      },
    }),
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`Google Places request failed (${response.status}): ${message}`);
  }

  const payload = (await response.json()) as {
    places?: Array<{
      id: string;
      displayName?: { text?: string };
      formattedAddress?: string;
      rating?: number;
      userRatingCount?: number;
      priceLevel?: string;
      currentOpeningHours?: { openNow?: boolean; weekdayDescriptions?: string[] };
      regularOpeningHours?: { weekdayDescriptions?: string[] };
      websiteUri?: string;
      googleMapsUri?: string;
      photos?: Array<{ name?: string }>;
      reviews?: Array<{
        text?: { text?: string };
        rating?: number;
        relativePublishTimeDescription?: string;
      }>;
      reviewSummary?: {
        text?: { text?: string };
        disclosureText?: { text?: string };
        reviewsUri?: string;
        flagContentUri?: string;
      };
    }>;
  };
  const place = payload.places?.[0];
  if (!place) return null;

  const result = {
    id: place.id,
    name: place.displayName?.text ?? query.name,
    address: place.formattedAddress ?? "",
    rating: place.rating ?? null,
    ratingCount: place.userRatingCount ?? null,
    priceLevel: place.priceLevel ?? null,
    openNow: place.currentOpeningHours?.openNow ?? null,
    hours: place.currentOpeningHours?.weekdayDescriptions ?? place.regularOpeningHours?.weekdayDescriptions ?? [],
    website: place.websiteUri ?? null,
    mapsUrl: place.googleMapsUri ?? null,
    photoName: place.photos?.[0]?.name ?? null,
    reviews: (place.reviews ?? []).flatMap((review) =>
      review.text?.text
        ? [{
            text: review.text.text,
            rating: review.rating ?? null,
            relativeTime: review.relativePublishTimeDescription ?? "",
          }]
        : [],
    ),
    reviewSummary: place.reviewSummary?.text?.text
      ? {
          text: place.reviewSummary.text.text,
          disclosureText: place.reviewSummary.disclosureText?.text ?? "Summarized with Gemini",
          reviewsUri: place.reviewSummary.reviewsUri ?? place.googleMapsUri ?? "",
          flagContentUri: place.reviewSummary.flagContentUri ?? "",
        }
      : null,
  };
  return result;
}

export async function getGooglePhotoUrl(apiKey: string, photoName: string) {
  const url = new URL(`https://places.googleapis.com/v1/${photoName}/media`);
  url.searchParams.set("maxWidthPx", "1200");
  url.searchParams.set("maxHeightPx", "800");
  url.searchParams.set("skipHttpRedirect", "true");
  const response = await fetch(url, { headers: { "X-Goog-Api-Key": apiKey } });
  if (!response.ok) throw new Error(`Google photo request failed (${response.status})`);
  const payload = (await response.json()) as { photoUri?: string };
  return payload.photoUri ?? null;
}
