import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { findGooglePlace, findNearbyCafes, getGooglePhotoUrl } from "./server/googlePlaces";
import { analyzeWorkability } from "./server/workability";
import { findMenuInsights } from "./server/menuInsights";
import { saveWorkabilityAnalysis } from "./server/workabilityCache";

function localDevApi(googleApiKey: string, anthropicApiKey?: string): Plugin {
  return {
    name: "google-places-dev-api",
    configureServer(server) {
      server.middlewares.use(async (request, response, next) => {
        if (request.url === "/api/cafes") {
          try {
            response.setHeader("Content-Type", "application/json");
            return response.end(JSON.stringify(await findNearbyCafes(googleApiKey)));
          } catch (error) {
            console.error(error);
            response.statusCode = 502;
            return response.end(JSON.stringify({ error: "Nearby cafes could not be loaded." }));
          }
        }
        if (!request.url?.startsWith("/api/place")) return next();
        const url = new URL(request.url, "http://localhost");

        try {
          if (url.pathname === "/api/place-photo") {
            const photoName = url.searchParams.get("name") ?? "";
            const photoUrl = await getGooglePhotoUrl(googleApiKey, photoName);
            if (!photoUrl) {
              response.statusCode = 404;
              return response.end();
            }
            response.statusCode = 302;
            response.setHeader("Location", photoUrl);
            return response.end();
          }

          if (url.pathname === "/api/place") {
            const name = url.searchParams.get("name") ?? "";
            const lat = Number(url.searchParams.get("lat"));
            const lng = Number(url.searchParams.get("lng"));
            const place = await findGooglePlace(googleApiKey, { name, lat, lng });
            response.setHeader("Content-Type", "application/json");
            response.statusCode = place ? 200 : 404;
            return response.end(JSON.stringify(place ?? { error: "Place not found." }));
          }
        } catch (error) {
          console.error(error);
          response.statusCode = 502;
          response.setHeader("Content-Type", "application/json");
          return response.end(JSON.stringify({ error: "Google Places could not be reached." }));
        }

        next();
      });
      server.middlewares.use("/api/workability", async (request, response) => {
        response.setHeader("Content-Type", "application/json");
        if (request.method !== "POST") {
          response.statusCode = 405;
          return response.end(JSON.stringify({ error: "Method not allowed." }));
        }
        if (!anthropicApiKey) {
          response.statusCode = 503;
          return response.end(JSON.stringify({ error: "Claude is not configured." }));
        }
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of request) chunks.push(Buffer.from(chunk));
          const place = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          const analysis = await analyzeWorkability(anthropicApiKey, place);
          await saveWorkabilityAnalysis(place, analysis);
          return response.end(JSON.stringify(analysis));
        } catch (error) {
          console.error(error);
          response.statusCode = 502;
          return response.end(JSON.stringify({ error: "Claude could not analyze this cafe." }));
        }
      });
      server.middlewares.use("/api/menu-insights", async (request, response) => {
        response.setHeader("Content-Type", "application/json");
        if (request.method !== "POST") {
          response.statusCode = 405;
          return response.end(JSON.stringify({ error: "Method not allowed." }));
        }
        if (!anthropicApiKey) {
          response.statusCode = 503;
          return response.end(JSON.stringify({ error: "Claude is not configured." }));
        }
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of request) chunks.push(Buffer.from(chunk));
          const input = JSON.parse(Buffer.concat(chunks).toString("utf8"));
          return response.end(JSON.stringify(await findMenuInsights(anthropicApiKey, input)));
        } catch (error) {
          console.error(error);
          return response.end(JSON.stringify({
            status: "unavailable",
            priceRange: null,
            items: [],
            menuUrl: null,
            note: "The official menu could not be read.",
          }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const deploymentHost = env.VITE_SITE_URL || env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL;
  const siteUrl = deploymentHost
    ? deploymentHost.startsWith("http") ? deploymentHost : `https://${deploymentHost}`
    : "";
  const ogImage = siteUrl ? `${siteUrl.replace(/\/$/, "")}/og-workabout.png` : "/og-workabout.png";
  return {
    build: {
      target: "es2019",
    },
    plugins: [
      react(),
      {
        name: "workabout-social-meta",
        transformIndexHtml(html) {
          return html.replaceAll("__OG_IMAGE__", ogImage);
        },
      },
      ...(env.GOOGLE_PLACES_API_KEY ? [localDevApi(env.GOOGLE_PLACES_API_KEY, env.ANTHROPIC_API_KEY)] : []),
    ],
  };
});
