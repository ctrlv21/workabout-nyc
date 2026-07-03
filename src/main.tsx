import React, { useEffect, useMemo, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import mapboxgl, { Map, Marker, Popup } from "mapbox-gl";
import "@fontsource-variable/fraunces";
import "mapbox-gl/dist/mapbox-gl.css";
import "./styles.css";
import type { GoogleCafeSummary, GooglePlace } from "../server/googlePlaces";
import type { WorkabilityAnalysis } from "../server/workability";
import type { MenuInsights } from "../server/menuInsights";
import {
  Cafe,
  CafeTag,
  CAFES,
  getConfidence,
  getOpenStatus,
  getRatingLogic,
  mapsUrl,
  matchesFilterTag,
  TAGS,
} from "./cafes";
import { fetchStoredWorkability, submitCommunityRating } from "./supabase";

const OVERVIEW = {
  center: [-73.976, 40.739] as [number, number],
  zoom: 12.8,
  pitch: 62,
  bearing: -28,
};

const INTRO_VIEW = {
  center: [-73.976, 40.739] as [number, number],
  zoom: 11.7,
  pitch: 55,
  bearing: -30,
};

const CAFE_DISCOVERY_CACHE_KEY = "workabout-nyc-cafes-v2";

const NEIGHBORHOODS = [
  { label: "Midtown", borough: "Manhattan", center: [-73.9857, 40.7484] as [number, number], zoom: 15.9, pitch: 73, bearing: -38 },
  { label: "Chelsea", borough: "Manhattan", center: [-74.0014, 40.7448] as [number, number], zoom: 16.15, pitch: 73, bearing: -24 },
  { label: "East Village", borough: "Manhattan", center: [-73.9844, 40.7275] as [number, number], zoom: 16.25, pitch: 73, bearing: -22 },
  { label: "SoHo", borough: "Manhattan", center: [-74.0007, 40.7233] as [number, number], zoom: 16.1, pitch: 72, bearing: -18 },
  { label: "UWS", borough: "Manhattan", center: [-73.978, 40.783] as [number, number], zoom: 15.75, pitch: 72, bearing: -30 },
  { label: "Harlem", borough: "Manhattan", center: [-73.9448, 40.8116] as [number, number], zoom: 15.7, pitch: 72, bearing: -25 },
  { label: "Williamsburg", borough: "Brooklyn", center: [-73.958, 40.7152] as [number, number], zoom: 16.25, pitch: 73, bearing: -28 },
  { label: "Greenpoint", borough: "Brooklyn", center: [-73.9544, 40.7305] as [number, number], zoom: 15.9, pitch: 72, bearing: -26 },
  { label: "Bushwick", borough: "Brooklyn", center: [-73.9213, 40.7025] as [number, number], zoom: 15.75, pitch: 72, bearing: -20 },
  { label: "Fort Greene", borough: "Brooklyn", center: [-73.9754, 40.6918] as [number, number], zoom: 15.9, pitch: 72, bearing: -24 },
  { label: "Downtown BK", borough: "Brooklyn", center: [-73.9857, 40.6935] as [number, number], zoom: 15.8, pitch: 72, bearing: -30 },
];

type TimeTheme = "dawn" | "day" | "dusk" | "night";

type MarkerRecord = {
  cafe: Cafe;
  element: HTMLButtonElement;
  marker: Marker;
};

type UserLocation = {
  lat: number;
  lng: number;
};

type LocationStatus = "idle" | "prompting" | "ready" | "blocked" | "timeout" | "unavailable" | "unsupported";

type WorkFeedback = {
  outlets: string;
  seating: string;
  noise: string;
  calls: string;
  notes: string;
};

const INITIAL_SHARE_STATE = readShareState();

function App() {
  const [tags, setTags] = useState<Set<CafeTag>>(() => new Set(INITIAL_SHARE_STATE.tags));
  const [activeCafe, setActiveCafe] = useState<Cafe | null>(null);
  const [splashDone, setSplashDone] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(Boolean(INITIAL_SHARE_STATE.cafe));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [focusedArea, setFocusedArea] = useState<string | null>(INITIAL_SHARE_STATE.area);
  const [discoveredCafes, setDiscoveredCafes] = useState<Cafe[]>([]);
  const [livePlace, setLivePlace] = useState<GooglePlace | null>(null);
  const [livePlaceStatus, setLivePlaceStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [workability, setWorkability] = useState<Record<string, WorkabilityAnalysis>>(readWorkabilityAnalyses);
  const [workabilityStatus, setWorkabilityStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [menuInsights, setMenuInsights] = useState<Record<string, MenuInsights>>({});
  const [menuStatus, setMenuStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [backgroundAnalysis, setBackgroundAnalysis] = useState({ complete: 0, total: 0 });
  const [communityProfiles, setCommunityProfiles] = useState<Record<string, WorkFeedback>>(readCommunityProfiles);
  const [timeTheme, setTimeTheme] = useState<TimeTheme>(getNYCTimeTheme);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const [shareStatus, setShareStatus] = useState<"idle" | "copied">("idle");
  const mapRef = useRef<Map | null>(null);
  const markersRef = useRef<MarkerRecord[]>([]);
  const mapNodeRef = useRef<HTMLDivElement | null>(null);
  const gestureRotateRef = useRef<{ active: boolean; x: number } | null>(null);
  const selectedPopupRef = useRef<Popup | null>(null);
  const hoverPopupRef = useRef<Popup | null>(null);
  const selectedCafeKeyRef = useRef<string | null>(null);
  const initialCafeRestoredRef = useRef(false);
  const introPlayedRef = useRef(false);
  const token = import.meta.env.VITE_MAPBOX_TOKEN as string | undefined;
  const hasToken = Boolean(token?.startsWith("pk."));

  const allCafes = useMemo(() => [...CAFES, ...discoveredCafes], [discoveredCafes]);
  const visibleCafes = useMemo(
    () =>
      allCafes.filter((cafe) => {
        for (const tag of tags) {
          if (
            !matchesEvidenceFilter(
              cafe,
              tag,
              workability[cafeKey(cafe)] ?? null,
              communityProfiles[cafeKey(cafe)] ?? null,
            )
          ) return false;
        }
        return true;
      }),
    [allCafes, communityProfiles, tags, workability],
  );
  const browsableCafes = useMemo(
    () => focusedArea
      ? visibleCafes.filter((cafe) => cafe.h === focusedArea)
      : visibleCafes,
    [focusedArea, visibleCafes],
  );
  const filterCount = browsableCafes.length;
  const bestNearby = useMemo(
    () => userLocation ? findBestNearby(visibleCafes, userLocation, workability) : null,
    [userLocation, visibleCafes, workability],
  );

  useEffect(() => {
    if (!INITIAL_SHARE_STATE.cafe || initialCafeRestoredRef.current) return;
    const cafe = allCafes.find((item) =>
      item.placeId === INITIAL_SHARE_STATE.cafe || cafeKey(item) === INITIAL_SHARE_STATE.cafe,
    );
    if (cafe) {
      initialCafeRestoredRef.current = true;
      setFocusedArea(cafe.h);
      setActiveCafe(cafe);
    }
  }, [allCafes]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (focusedArea) {
      url.searchParams.set("area", focusedArea);
      url.searchParams.delete("view");
    } else {
      url.searchParams.delete("area");
      url.searchParams.set("view", "overview");
    }
    if (tags.size) url.searchParams.set("filters", [...tags].join(","));
    else url.searchParams.delete("filters");
    if (activeCafe) url.searchParams.set("cafe", activeCafe.placeId ?? cafeKey(activeCafe));
    else url.searchParams.delete("cafe");
    window.history.replaceState(null, "", url);
  }, [activeCafe, focusedArea, tags]);

  useEffect(() => {
    const timer = window.setTimeout(() => setSplashDone(true), 1700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (discoveredCafes.length === 0) return;
    let cancelled = false;

    async function hydrateAndAnalyze() {
      const local = readWorkabilityAnalyses();
      try {
        const stored = await fetchStoredWorkability(
          discoveredCafes.flatMap((cafe) => cafe.placeId ? [cafe.placeId] : []),
        );
        if (cancelled) return;
        setWorkability((current) => {
          let next = current;
          discoveredCafes.forEach((cafe) => {
            const analysis = cafe.placeId ? stored.get(cafe.placeId) : null;
            if (analysis) next = persistWorkabilityAnalysis(next, cafeKey(cafe), analysis);
          });
          return next;
        });

        stored.forEach((analysis, placeId) => {
          const cafe = discoveredCafes.find((item) => item.placeId === placeId);
          if (cafe) local[cafeKey(cafe)] = analysis;
        });
      } catch (error) {
        console.error("Shared score cache unavailable", error);
      }

      const pending = discoveredCafes.filter((cafe) => !local[cafeKey(cafe)]);
      if (pending.length === 0 || cancelled) return;
      let cursor = 0;
      let complete = 0;
      setBackgroundAnalysis({ complete: 0, total: pending.length });

      async function analyzeNext() {
        while (!cancelled) {
          const cafe = pending[cursor++];
          if (!cafe) return;
          try {
            const query = new URLSearchParams({
              name: cafe.n,
              lat: String(cafe.lat),
              lng: String(cafe.lng),
            });
            const placeResponse = await fetch(`/api/place?${query}`);
            if (!placeResponse.ok) throw new Error("Place lookup failed");
            const place = (await placeResponse.json()) as GooglePlace;
            const analysisResponse = await fetch("/api/workability", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(place),
            });
            if (!analysisResponse.ok) throw new Error("Workability analysis failed");
            const analysis = (await analysisResponse.json()) as WorkabilityAnalysis;
            if (!cancelled) {
              setWorkability((current) => persistWorkabilityAnalysis(current, cafeKey(cafe), analysis));
            }
          } catch (error) {
            console.error(`Background analysis failed for ${cafe.n}`, error);
          } finally {
            complete += 1;
            if (!cancelled) setBackgroundAnalysis({ complete, total: pending.length });
          }
        }
      }

      const workers = window.matchMedia("(max-width: 700px)").matches ? 1 : 2;
      await Promise.all(Array.from({ length: workers }, () => analyzeNext()));
    }

    void hydrateAndAnalyze();
    return () => {
      cancelled = true;
    };
  }, [discoveredCafes]);

  useEffect(() => {
    const fallback = window.setTimeout(() => setMapReady(true), 5600);
    return () => window.clearTimeout(fallback);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const cached = window.localStorage.getItem(CAFE_DISCOVERY_CACHE_KEY);
    if (cached) {
      try {
        const places = JSON.parse(cached) as GoogleCafeSummary[];
        setDiscoveredCafes(toUniqueDiscoveredCafes(places));
        return () => controller.abort();
      } catch {
        window.localStorage.removeItem(CAFE_DISCOVERY_CACHE_KEY);
      }
    }

    fetch("/api/cafes", { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Cafe discovery failed");
        return (await response.json()) as GoogleCafeSummary[];
      })
      .then((places) => {
        window.localStorage.setItem(CAFE_DISCOVERY_CACHE_KEY, JSON.stringify(places));
        setDiscoveredCafes(toUniqueDiscoveredCafes(places));
      })
      .catch((error) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error);
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = timeTheme;
    const url = new URL(window.location.href);
    if (url.searchParams.has("theme")) {
      url.searchParams.delete("theme");
      window.history.replaceState(null, "", url);
    }
  }, [timeTheme]);

  useEffect(() => {
    const timer = window.setInterval(() => setTimeTheme(getNYCTimeTheme()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!hasToken || !mapNodeRef.current || mapRef.current) return;

    if (!mapboxgl.supported()) {
      setMapError("This browser cannot start the 3D map. Enable WebGL or hardware acceleration, then reload.");
      setMapReady(true);
      return;
    }

    mapboxgl.accessToken = token!;
    const compactMap = window.matchMedia("(max-width: 700px)").matches;
    let map: Map;
    try {
      map = new mapboxgl.Map({
        container: mapNodeRef.current,
        style: "mapbox://styles/mapbox/standard",
        config: {
          basemap: {
            lightPreset: timeTheme,
            show3dObjects: true,
            show3dFacades: true,
            showLandmarkIcons: false,
            showPointOfInterestLabels: false,
            showRoadLabels: true,
            showTransitLabels: true,
            densityPointOfInterestLabels: 1,
          },
        },
        center: INTRO_VIEW.center,
        zoom: INTRO_VIEW.zoom,
        pitch: INTRO_VIEW.pitch,
        bearing: INTRO_VIEW.bearing,
        antialias: !compactMap,
        fadeDuration: compactMap ? 0 : 300,
        dragRotate: true,
        touchPitch: true,
        maxZoom: 19.2,
        maxBounds: [
          [-74.18, 40.55],
          [-73.72, 40.92],
        ],
      });
    } catch (error) {
      console.error(error);
      setMapError("The 3D map could not start. Check browser graphics permissions and reload.");
      setMapReady(true);
      return;
    }

    map.scrollZoom.enable();
    map.scrollZoom.setZoomRate(1 / 140);
    map.scrollZoom.setWheelZoomRate(1 / 600);
    map.dragPan.enable();
    map.doubleClickZoom.enable();
    map.touchZoomRotate.enableRotation();
    map.dragRotate.enable();

    map.on("style.load", () => {
      try {
        map.setConfigProperty("basemap", "lightPreset", timeTheme);
        map.setConfigProperty("basemap", "showPointOfInterestLabels", false);
        map.setConfigProperty("basemap", "showTransitLabels", true);
        map.setConfigProperty("basemap", "show3dObjects", true);
        map.setConfigProperty("basemap", "showRoadLabels", true);
        map.setConfigProperty("basemap", "showPlaceLabels", true);
        map.setConfigProperty("basemap", "showLandmarkIcons", false);
        map.setConfigProperty("basemap", "show3dFacades", true);
        map.setConfigProperty("basemap", "densityPointOfInterestLabels", 1);
      } catch {
        // Mapbox Standard exposes these config keys; this keeps older style fallbacks quiet.
      }
    });
    map.once("idle", () => setMapReady(true));

    map.addControl(new mapboxgl.NavigationControl({ visualizePitch: true }), "top-right");
    const hoverPopup = new Popup({
      anchor: "bottom",
      closeButton: false,
      closeOnClick: false,
      offset: 44,
      className: "hover-place-popup",
    }).setAltitude(42);
    hoverPopupRef.current = hoverPopup;
    let hoverHideTimer: number | null = null;
    selectedPopupRef.current = new Popup({
      anchor: "bottom",
      closeButton: false,
      closeOnClick: false,
      offset: 44,
      className: "selected-place-popup",
    }).setAltitude(42);

    markersRef.current = CAFES.map((cafe, index) => {
      const element = document.createElement("button");
      element.className = "marker verified-marker";
      element.type = "button";
      element.style.setProperty("--marker-index", String(index));
      element.dataset.cafe = cafe.n;
      element.setAttribute("aria-label", `Open ${cafe.n}`);
      element.innerHTML = `<span class="pin"><span>${cafe.work.toFixed(1)}</span></span>`;

      element.addEventListener("mouseenter", () => {
        if (selectedCafeKeyRef.current === cafeKey(cafe)) return;
        if (hoverHideTimer) window.clearTimeout(hoverHideTimer);
        hoverPopup
          .setLngLat([cafe.lng, cafe.lat])
          .setHTML(popupHtml(cafe, false))
          .addTo(map);
      });
      element.addEventListener("mouseleave", () => {
        hoverHideTimer = window.setTimeout(() => hoverPopup.remove(), 120);
      });
      element.addEventListener("click", () => {
        selectedCafeKeyRef.current = cafeKey(cafe);
        if (hoverHideTimer) window.clearTimeout(hoverHideTimer);
        hoverPopup.remove();
        setActiveCafe(cafe);
        setFocusedArea(cafe.h);
        setPanelOpen(true);
      });

      return {
        cafe,
        element,
        marker: new mapboxgl.Marker({
          element,
          anchor: "bottom",
          occludedOpacity: 1,
          pitchAlignment: "viewport",
          rotationAlignment: "viewport",
        })
          .setLngLat([cafe.lng, cafe.lat])
          .setAltitude(42)
          .addTo(map),
      };
    });

    mapRef.current = map;

    const rotateStart = (event: PointerEvent) => {
      if (!event.shiftKey && !event.altKey) return;
      gestureRotateRef.current = { active: true, x: event.clientX };
      map.dragPan.disable();
      mapNodeRef.current?.setPointerCapture?.(event.pointerId);
    };
    const rotateMove = (event: PointerEvent) => {
      const rotateState = gestureRotateRef.current;
      if (!rotateState?.active) return;
      const delta = event.clientX - rotateState.x;
      rotateState.x = event.clientX;
      map.rotateTo(map.getBearing() + delta * 0.35, { duration: 0 });
    };
    const rotateEnd = (event: PointerEvent) => {
      if (!gestureRotateRef.current?.active) return;
      gestureRotateRef.current = null;
      map.dragPan.enable();
      mapNodeRef.current?.releasePointerCapture?.(event.pointerId);
    };

    const mapNode = mapNodeRef.current;
    mapNode?.addEventListener("pointerdown", rotateStart);
    mapNode?.addEventListener("pointermove", rotateMove);
    mapNode?.addEventListener("pointerup", rotateEnd);
    mapNode?.addEventListener("pointercancel", rotateEnd);

    return () => {
      mapNode?.removeEventListener("pointerdown", rotateStart);
      mapNode?.removeEventListener("pointermove", rotateMove);
      mapNode?.removeEventListener("pointerup", rotateEnd);
      mapNode?.removeEventListener("pointercancel", rotateEnd);
      hoverPopup.remove();
      hoverPopupRef.current = null;
      if (hoverHideTimer) window.clearTimeout(hoverHideTimer);
      selectedPopupRef.current?.remove();
      selectedPopupRef.current = null;
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current = [];
      map.remove();
      mapRef.current = null;
    };
  }, [hasToken, timeTheme, token]);

  useEffect(() => {
    if (!mapRef.current) return;
    try {
      mapRef.current.setConfigProperty("basemap", "lightPreset", timeTheme);
    } catch {
      // Style config may not be ready during initial load.
    }
  }, [timeTheme]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || discoveredCafes.length === 0) return;
    const popup = hoverPopupRef.current;
    if (!popup) return;
    const existing = new Set(markersRef.current.map(({ cafe }) => `${cafe.n}:${cafe.lat}:${cafe.lng}`));

    discoveredCafes.forEach((cafe) => {
      const key = `${cafe.n}:${cafe.lat}:${cafe.lng}`;
      if (existing.has(key)) return;
      const element = document.createElement("button");
      element.className = "marker discovered-marker";
      element.type = "button";
      element.dataset.cafe = cafe.n;
      element.setAttribute("aria-label", `Open ${cafe.n}`);
      const matches = visibleCafes.includes(cafe);
      const inFocusedArea = !focusedArea || cafe.h === focusedArea;
      element.classList.toggle("dim", !matches);
      element.classList.toggle("out-of-area", !inFocusedArea);
      element.disabled = !matches || !inFocusedArea;
      element.tabIndex = matches && inFocusedArea ? 0 : -1;
      element.setAttribute("aria-disabled", String(!matches || !inFocusedArea));
      const savedScore = readWorkabilityAnalyses()[cafeKey(cafe)]?.score;
      element.innerHTML = `<span class="pin"><span>${savedScore ? savedScore.toFixed(1) : "…"}</span></span>`;
      element.addEventListener("mouseenter", () => {
        if (selectedCafeKeyRef.current === cafeKey(cafe)) return;
        popup
          .setLngLat([cafe.lng, cafe.lat])
          .setHTML(popupHtml(cafe, false))
          .addTo(map);
      });
      element.addEventListener("mouseleave", () => window.setTimeout(() => popup.remove(), 120));
      element.addEventListener("click", () => {
        selectedCafeKeyRef.current = cafeKey(cafe);
        popup.remove();
        setActiveCafe(cafe);
        setFocusedArea(cafe.h);
        setPanelOpen(true);
      });
      const marker = new mapboxgl.Marker({
        element,
        anchor: "bottom",
        occludedOpacity: 1,
        pitchAlignment: "viewport",
        rotationAlignment: "viewport",
      })
        .setLngLat([cafe.lng, cafe.lat])
        .setAltitude(42)
        .addTo(map);
      markersRef.current.push({ cafe, element, marker });
    });

  }, [discoveredCafes, focusedArea, mapReady, visibleCafes]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !splashDone || introPlayedRef.current) return;
    introPlayedRef.current = true;
    const initialArea = NEIGHBORHOODS.find((place) => place.label === INITIAL_SHARE_STATE.area);
    if (initialArea) {
      map.flyTo({
        center: initialArea.center,
        zoom: initialArea.zoom + 0.55,
        pitch: 76,
        bearing: initialArea.bearing,
        duration: 1400,
        essential: true,
      });
      return;
    }
    map.flyTo({
      ...OVERVIEW,
      duration: 3000,
      curve: 1.45,
      speed: 0.68,
      essential: false,
    });
  }, [mapReady, splashDone]);

  useEffect(() => {
    markersRef.current.forEach(({ cafe, element }, index) => {
      const matches = visibleCafes.includes(cafe);
      const inFocusedArea = !focusedArea || cafe.h === focusedArea;
      element.style.setProperty("--filter-delay", `${(index % 12) * 10}ms`);
      element.classList.toggle("dim", !matches);
      element.classList.toggle("out-of-area", !inFocusedArea);
      element.disabled = !matches || !inFocusedArea;
      element.tabIndex = matches && inFocusedArea ? 0 : -1;
      element.setAttribute("aria-disabled", String(!matches || !inFocusedArea));
      element.classList.toggle("active", Boolean(activeCafe && cafeKey(activeCafe) === cafeKey(cafe)));
      const score = workability[cafeKey(cafe)]?.score;
      if (cafe.profiled === false) {
        const label = element.querySelector(".pin span");
        if (label) label.textContent = score ? score.toFixed(1) : "…";
      }
    });
  }, [activeCafe, focusedArea, visibleCafes, workability]);

  useEffect(() => {
    if (!activeCafe) {
      setLivePlace(null);
      setLivePlaceStatus("idle");
      return;
    }

    const controller = new AbortController();
    const query = new URLSearchParams({
      name: activeCafe.n,
      lat: String(activeCafe.lat),
      lng: String(activeCafe.lng),
    });
    setLivePlace(null);
    setLivePlaceStatus("loading");
    fetch(`/api/place?${query}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("Place lookup failed");
        return (await response.json()) as GooglePlace;
      })
      .then((place) => {
        setLivePlace(place);
        setLivePlaceStatus("ready");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setLivePlaceStatus("error");
      });

    return () => controller.abort();
  }, [activeCafe]);

  useEffect(() => {
    if (!activeCafe || activeCafe.profiled !== false || !livePlace) {
      setWorkabilityStatus("idle");
      return;
    }
    const key = cafeKey(activeCafe);
    if (workability[key]) {
      setWorkabilityStatus("ready");
      return;
    }

    const controller = new AbortController();
    setWorkabilityStatus("loading");
    fetch("/api/workability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(livePlace),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Workability analysis failed");
        return (await response.json()) as WorkabilityAnalysis;
      })
      .then((analysis) => {
        setWorkability((current) => persistWorkabilityAnalysis(current, key, analysis));
        setWorkabilityStatus("ready");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error(error);
        setWorkabilityStatus("error");
      });

    return () => controller.abort();
  }, [activeCafe, livePlace]);

  useEffect(() => {
    if (!activeCafe || !livePlace?.website) {
      setMenuStatus("idle");
      return;
    }
    const key = cafeKey(activeCafe);
    if (menuInsights[key]) {
      setMenuStatus("ready");
      return;
    }
    const controller = new AbortController();
    setMenuStatus("loading");
    fetch("/api/menu-insights", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: livePlace.name, website: livePlace.website }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("Menu lookup failed");
        return (await response.json()) as MenuInsights;
      })
      .then((insights) => {
        setMenuInsights((current) => ({ ...current, [key]: insights }));
        setMenuStatus("ready");
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error(error);
        setMenuStatus("ready");
      });
    return () => controller.abort();
  }, [activeCafe, livePlace, menuInsights]);

  useEffect(() => {
    if (!mapRef.current) return;

    if (activeCafe) {
      selectedCafeKeyRef.current = cafeKey(activeCafe);
      hoverPopupRef.current?.remove();
      selectedPopupRef.current
        ?.setLngLat([activeCafe.lng, activeCafe.lat])
        .setHTML(popupHtml(activeCafe, true, null))
        .addTo(mapRef.current);
      mapRef.current.flyTo({
        center: [activeCafe.lng, activeCafe.lat],
        zoom: 17.15,
        pitch: 70,
        bearing: -24,
        duration: 1650,
        curve: 1.24,
        padding: window.innerWidth < 880
          ? { top: 24, right: 24, bottom: 300, left: 24 }
          : { top: 24, right: 430, bottom: 24, left: 24 },
        retainPadding: false,
        essential: true,
      });
      return;
    }

    selectedCafeKeyRef.current = null;
    selectedPopupRef.current?.remove();
  }, [activeCafe]);

  function toggleTag(tag: CafeTag) {
    setActiveCafe(null);
    setTags((current) => {
      const next = new Set(current);
      if (next.has(tag)) next.delete(tag);
      else next.add(tag);
      return next;
    });
  }

  function resetFilters() {
    setActiveCafe(null);
    setTags(new Set());
  }

  function showOverview() {
    setActiveCafe(null);
    setFocusedArea(null);
    setPanelOpen(false);
    hoverPopupRef.current?.remove();
    mapRef.current?.flyTo({ ...OVERVIEW, duration: 1500, curve: 1.25, essential: true });
  }

  function closeDetails() {
    setPanelOpen(false);
    setActiveCafe(null);
    selectedCafeKeyRef.current = null;
    selectedPopupRef.current?.remove();
    hoverPopupRef.current?.remove();
  }

  async function requestLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("unsupported");
      return;
    }

    if (navigator.permissions) {
      try {
        const permission = await navigator.permissions.query({ name: "geolocation" });
        if (permission.state === "denied") {
          setLocationStatus("blocked");
          return;
        }
      } catch {
        // Some browsers expose geolocation without supporting a permission query.
      }
    }

    setLocationStatus("prompting");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus("ready");
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) setLocationStatus("blocked");
        else if (error.code === error.TIMEOUT) setLocationStatus("timeout");
        else setLocationStatus("unavailable");
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    );
  }

  function useMapCenterLocation() {
    const center = mapRef.current?.getCenter();
    if (!center) return;
    setUserLocation({ lat: center.lat, lng: center.lng });
    setLocationStatus("ready");
  }

  async function saveCommunityProfile(cafe: Cafe, feedback: WorkFeedback) {
    await submitCommunityRating({
      cafe_key: cafeKey(cafe),
      cafe_name: cafe.n,
      google_place_id: cafe.placeId ?? null,
      neighborhood: cafe.h,
      borough: cafe.b,
      ...feedback,
      notes: feedback.notes.trim() || null,
      contributor_id: getContributorId(),
    });

    setCommunityProfiles((current) => {
      const next = { ...current, [cafeKey(cafe)]: feedback };
      window.localStorage.setItem("workabout-nyc-community-profiles", JSON.stringify(next));
      return next;
    });
  }

  function flyToNeighborhood(place: (typeof NEIGHBORHOODS)[number]) {
    setActiveCafe(null);
    selectedCafeKeyRef.current = null;
    setFocusedArea(place.label);
    setPanelOpen(false);
    selectedPopupRef.current?.remove();
    hoverPopupRef.current?.remove();
    mapRef.current?.flyTo({
      center: place.center,
      zoom: place.zoom + 0.9,
      pitch: 74,
      bearing: place.bearing,
      duration: 2050,
      curve: 1.18,
      essential: true,
    });
  }

  async function shareCurrentView() {
    const share = {
      title: "Workabout NYC",
      text: focusedArea ? `Laptop-friendly cafes in ${focusedArea}` : "Find a better place to work in NYC.",
      url: window.location.href,
    };
    try {
      if (navigator.share) await navigator.share(share);
      else await navigator.clipboard.writeText(share.url);
      setShareStatus("copied");
      window.setTimeout(() => setShareStatus("idle"), 1600);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) console.error(error);
    }
  }

  function openCafe(cafe: Cafe) {
    selectedCafeKeyRef.current = cafeKey(cafe);
    hoverPopupRef.current?.remove();
    setActiveCafe(cafe);
    setFocusedArea(cafe.h);
    setPanelOpen(true);
  }

  const commute = activeCafe && userLocation ? getCommute(activeCafe, userLocation) : null;

  return (
    <>
      <Splash done={splashDone && (mapReady || !hasToken)} />
      <main className="app">
        <section className={`map-stage ${focusedArea ? "focused" : ""} ${activeCafe ? "cafe-focused" : ""}`} aria-label="Interactive 3D NYC cafe map">
          <div className={`map-shell ${mapReady ? "ready" : ""}`}>
            <div ref={mapNodeRef} id="map" />
            <div className="map-vignette" />
            <div className={`map-scan ${splashDone ? "play" : ""}`} />
          </div>
          {!hasToken && <TokenWarning />}
          {mapError && <MapFailure message={mapError} />}

          <div className="top-hud">
            <div className="brand-panel">
              <h1><span>workabout</span> <em>NYC</em></h1>
              <div className="hero-actions">
                <button className="primary-action" onClick={() => setPanelOpen(true)} type="button">
                  Browse spots
                </button>
                <button className="ghost-action" onClick={requestLocation} type="button">
                  {locationStatus === "prompting" ? "Locating..." : "Use my location"}
                </button>
              </div>
              {locationStatus !== "idle" && (
                <div className="location-feedback">
                  <p className="location-note">{locationCopy(locationStatus)}</p>
                  {locationStatus === "blocked" && (
                    <button className="location-fallback" onClick={useMapCenterLocation} type="button">
                      Use map center instead
                    </button>
                  )}
                  {bestNearby && (
                    <button className="nearby-pick" onClick={() => openCafe(bestNearby)} type="button">
                      <span>Best nearby now</span>
                      <strong>{bestNearby.n}</strong>
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="top-controls">
              <NeighborhoodDock activeArea={focusedArea} onFlyTo={flyToNeighborhood} onOverview={showOverview} />
              <CameraDock
                timeTheme={timeTheme}
                backgroundAnalysis={backgroundAnalysis}
                onShare={shareCurrentView}
                shareStatus={shareStatus}
              />
            </div>
          </div>
          <MapLegend />
          <FilterDock
            count={filterCount}
            expanded={filtersOpen}
            onReset={resetFilters}
            onToggleExpanded={() => setFiltersOpen((current) => !current)}
            onToggleTag={toggleTag}
            tags={tags}
          />
          {tags.size > 0 && filterCount === 0 && (
            <div className="zero-results" role="status">
              <span>No matches{focusedArea ? ` in ${focusedArea}` : ""}</span>
              <button onClick={resetFilters} type="button">Clear filters</button>
            </div>
          )}
          <div className="creator-credit">
            <a href="https://github.com/ctrlv21" rel="noopener noreferrer" target="_blank">© 2026 ctrlv21</a>
            <span>·</span>
            <a href="https://x.com/ruchagav_" rel="noopener noreferrer" target="_blank">@ruchagav_</a>
          </div>
        </section>

        <aside className={`spot-drawer ${panelOpen ? "open" : ""}`} aria-label="Selected cafe details">
          <div className="drawer-toolbar">
            {activeCafe ? (
              <button className="back" onClick={() => setActiveCafe(null)} type="button">
                <span aria-hidden="true">←</span> All spots
              </button>
            ) : <span />}
            <button className="drawer-close" onClick={closeDetails} type="button" aria-label="Close details">
              <span aria-hidden="true">×</span>
            </button>
          </div>
          {activeCafe ? (
            <DetailView
              cafe={activeCafe}
              commute={commute}
              livePlace={livePlace}
              livePlaceStatus={livePlaceStatus}
              workability={workability[cafeKey(activeCafe)] ?? null}
              workabilityStatus={workabilityStatus}
              menuInsights={menuInsights[cafeKey(activeCafe)] ?? null}
              menuStatus={menuStatus}
              communityProfile={communityProfiles[cafeKey(activeCafe)] ?? null}
              locationStatus={locationStatus}
              onRequestLocation={requestLocation}
              onSaveFeedback={(feedback) => saveCommunityProfile(activeCafe, feedback)}
            />
          ) : (
            <DrawerList cafes={browsableCafes} area={focusedArea} onOpen={setActiveCafe} onReset={resetFilters} />
          )}
        </aside>
      </main>
    </>
  );
}

function CameraDock({
  timeTheme,
  backgroundAnalysis,
  onShare,
  shareStatus,
}: {
  timeTheme: TimeTheme;
  backgroundAnalysis: { complete: number; total: number };
  onShare: () => void;
  shareStatus: "idle" | "copied";
}) {
  const isAnalyzing = backgroundAnalysis.total > 0 && backgroundAnalysis.complete < backgroundAnalysis.total;
  return (
    <div className="camera-dock" aria-label="Map camera controls">
      {isAnalyzing && <span>Claude scoring {backgroundAnalysis.complete}/{backgroundAnalysis.total}</span>}
      <span
        className="time-indicator"
        data-period={timeTheme}
        role="img"
        aria-label={`${timeTheme} in NYC`}
      >
        <i aria-hidden="true" />
      </span>
      <button className="share-control" onClick={onShare} type="button" aria-label="Share this map view">
        <i className="share-glyph" aria-hidden="true">{shareStatus === "copied" ? "✓" : "↗"}</i>
      </button>
    </div>
  );
}

function Splash({ done }: { done: boolean }) {
  const skyline = [24, 42, 31, 66, 48, 92, 58, 76, 38, 64, 100, 72, 46, 82, 54, 34, 60];
  return (
    <div className={`splash ${done ? "done" : ""}`} aria-hidden={done}>
      <div className="splash-brand">
        <span>workabout</span>
        <em>NYC</em>
      </div>
      <div className="splash-skyline">
        {skyline.map((height, index) => (
          <i key={`${height}-${index}`} style={{ "--height": `${height}%`, "--delay": `${index * 42}ms` } as React.CSSProperties} />
        ))}
      </div>
      <div className="splash-status">
        <span>40.7128° N</span>
        <i />
        <span>74.0060° W</span>
      </div>
    </div>
  );
}

function NeighborhoodDock({
  activeArea,
  onFlyTo,
  onOverview,
}: {
  activeArea: string | null;
  onFlyTo: (place: (typeof NEIGHBORHOODS)[number]) => void;
  onOverview: () => void;
}) {
  const [open, setOpen] = useState(false);
  const groups = ["Manhattan", "Brooklyn"] as const;

  return (
    <div className={`neighborhood-dock ${open ? "open" : ""}`} aria-label="Neighborhood camera shortcuts">
      <div className="area-trigger-row">
        {activeArea && (
          <button className="overview-link" onClick={onOverview} type="button">
            NYC overview
          </button>
        )}
        <button className="area-trigger" onClick={() => setOpen((current) => !current)} type="button" aria-expanded={open}>
          {activeArea ?? "Areas"} <span aria-hidden="true">{open ? "−" : "+"}</span>
        </button>
      </div>
      <div className="area-menu">
        {groups.map((borough) => (
          <div className="area-group" key={borough}>
            <p>{borough}</p>
            {NEIGHBORHOODS.filter((place) => place.borough === borough).map((place) => (
              <button
                className={activeArea === place.label ? "on" : ""}
                key={place.label}
                onClick={() => {
                  onFlyTo(place);
                  setOpen(false);
                }}
                type="button"
              >
                {place.label}
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function MapLegend() {
  return (
    <div className="map-legend" aria-label="Map pin legend">
      <span><i className="legend-dot verified" />Verified</span>
      <span><i className="legend-dot provisional" />AI analysis</span>
    </div>
  );
}

function FilterDock({
  count,
  expanded,
  onReset,
  onToggleExpanded,
  onToggleTag,
  tags,
}: {
  count: number;
  expanded: boolean;
  onReset: () => void;
  onToggleExpanded: () => void;
  onToggleTag: (tag: CafeTag) => void;
  tags: Set<CafeTag>;
}) {
  const allActive = tags.size === 0;

  return (
    <div className={`filter-dock ${expanded ? "expanded" : ""}`} aria-label="Cafe filters">
      <span className="filter-count">{String(count).padStart(2, "0")}</span>
      <button className={`chip ${allActive ? "on" : ""}`} onClick={onReset} type="button">
        All
      </button>
      <button className={`chip filter-toggle ${expanded ? "on" : ""}`} onClick={onToggleExpanded} type="button">
        Filters
      </button>
      <div className="extra-filters">
        <button className="chip close-filters" onClick={onToggleExpanded} type="button" aria-label="Close filters">
          ×
        </button>
        {TAGS.map((tag) => (
          <button className={`chip filter-${slugify(tag)} ${tags.has(tag) ? "on" : ""}`} key={tag} onClick={() => onToggleTag(tag)} type="button">
            {tag}
          </button>
        ))}
      </div>
    </div>
  );
}

function CafeTray({ cafes, onOpen }: { cafes: Cafe[]; onOpen: (cafe: Cafe) => void }) {
  return (
    <div className="cafe-tray">
      {cafes.map((cafe) => {
        const status = getOpenStatus(cafe);
        const confidence = getConfidence(cafe);
        return (
          <button className="tray-card" key={cafeKey(cafe)} onClick={() => onOpen(cafe)} type="button">
            <span className={`open-pill ${status.open ? "is-open" : ""}`}>
              {cafe.profiled === false ? "Google discovery" : status.label}
            </span>
            {confidence && <span className={`confidence-badge ${confidence.replaceAll(" ", "-")}`}>{confidence}</span>}
            <span className="tray-score">{cafe.profiled === false ? "+" : cafe.work.toFixed(1)}</span>
            <span className="tray-name">{cafe.n}</span>
            <span className="tray-meta">
              {cafe.address || `${cafe.h} · ${cafe.seatingStyles.slice(0, 2).join(" / ")}`}
            </span>
            <span className="tray-meta">
              {cafe.profiled === false ? "Select for live details" : `Food ${cafe.avgFoodCost} · ${cafe.charging}`}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function DrawerList({
  cafes,
  area,
  onOpen,
  onReset,
}: {
  cafes: Cafe[];
  area: string | null;
  onOpen: (cafe: Cafe) => void;
  onReset: () => void;
}) {
  return (
    <div className="drawer-list">
      <p className="kicker">select a spot</p>
      <h2>
        {String(cafes.length).padStart(2, "0")} {area ? `spots in ${area}` : "laptop-friendly cafes"}
      </h2>
      {cafes.length === 0 ? (
        <div className="drawer-empty">
          <p>No cafes match this combination yet.</p>
          <button className="mini-action" onClick={onReset} type="button">Clear filters</button>
        </div>
      ) : (
        <div className="list">
          {cafes.map((cafe) => (
          <button className="row" key={cafeKey(cafe)} onClick={() => onOpen(cafe)} type="button">
            <span>
              <span className="nm">{cafe.n}</span>
              <span className="hd">
                {cafe.profiled === false ? cafe.address : `${cafe.h} · ${getOpenStatus(cafe).label}`}
              </span>
              {getConfidence(cafe) && <span className="hd">{getConfidence(cafe)}</span>}
            </span>
            <span className="rt">{cafe.profiled === false ? "+" : cafe.work.toFixed(1)}</span>
          </button>
          ))}
        </div>
      )}
    </div>
  );
}

function DetailView({
  cafe,
  commute,
  livePlace,
  livePlaceStatus,
  workability,
  workabilityStatus,
  menuInsights,
  menuStatus,
  communityProfile,
  locationStatus,
  onRequestLocation,
  onSaveFeedback,
}: {
  cafe: Cafe;
  commute: ReturnType<typeof getCommute> | null;
  livePlace: GooglePlace | null;
  livePlaceStatus: "idle" | "loading" | "ready" | "error";
  workability: WorkabilityAnalysis | null;
  workabilityStatus: "idle" | "loading" | "ready" | "error";
  menuInsights: MenuInsights | null;
  menuStatus: "idle" | "loading" | "ready";
  communityProfile: WorkFeedback | null;
  locationStatus: LocationStatus;
  onRequestLocation: () => void;
  onSaveFeedback: (feedback: WorkFeedback) => Promise<void>;
}) {
  const confidence = getConfidence(cafe);
  const ratingLogic = getRatingLogic(cafe);

  return (
    <div className="detail">
      {livePlace?.photoName ? (
        <img className="detail-photo" src={placePhotoUrl(livePlace)} alt="" />
      ) : (
        <div className="detail-photo detail-photo-loading" aria-hidden="true">
          <span>{livePlaceStatus === "error" ? "Photo unavailable" : "Loading place photo"}</span>
        </div>
      )}
      <h2 className="dname">{livePlace?.name ?? cafe.n}</h2>
      <p className="dhood">
        {livePlace?.address || `${cafe.h} · ${cafe.b}`}
      </p>
      <p className={`detail-status ${(livePlace?.openNow ?? getOpenStatus(cafe).open) ? "is-open" : ""}`}>
        {livePlace
          ? `${livePlace.openNow ? "Open now" : "Closed now"} · ${todayHours(livePlace.hours) || "hours unavailable"}`
          : `${getOpenStatus(cafe).label} · today ${getOpenStatus(cafe).today}`}
      </p>
      <p className={`live-source ${livePlaceStatus}`}>
        {livePlaceStatus === "loading" && "Loading live place data..."}
        {livePlaceStatus === "ready" && "Live · Google Places"}
        {livePlaceStatus === "error" && "Live data unavailable · showing curated details"}
      </p>
      {confidence && (
        <p className={`confidence-badge detail-confidence ${confidence.replaceAll(" ", "-")}`}>
          {confidence}
        </p>
      )}
      {cafe.profiled === false ? (
        <>
          <div className="ai-work-score">
            {workability?.evidence.length ? (
              <div className="ai-evidence-block">
                <span className="ai-evidence-label">Evidence reviewed</span>
                <ul className="ai-evidence">
                  {workability.evidence.map((item) => <li key={item}>{item}</li>)}
                </ul>
              </div>
            ) : null}
            <div className="ai-score-row">
              <span>Workability analysis</span>
              <strong>{workability ? workability.score.toFixed(1) : "—"} / 5</strong>
            </div>
            <span className="ai-confidence">
              {workabilityStatus === "loading"
                ? "Analyzing workability..."
                : workabilityStatus === "error"
                  ? "Analysis unavailable"
                  : workability
                    ? `${workability.confidence} confidence`
                    : "Awaiting evidence"}
            </span>
            {workability && <p>{workability.verdict}</p>}
            {livePlace?.reviewSummary && (
              <div className="summary-links">
                <span>AI analysis uses Google Places evidence. {livePlace.reviewSummary.disclosureText}.</span>
                <a href={livePlace.reviewSummary.reviewsUri} target="_blank" rel="noopener noreferrer">See source reviews</a>
                {livePlace.reviewSummary.flagContentUri && (
                  <a href={livePlace.reviewSummary.flagContentUri} target="_blank" rel="noopener noreferrer">Report source summary</a>
                )}
              </div>
            )}
          </div>
          <FeedbackPanel key={cafeKey(cafe)} initial={communityProfile} onSave={onSaveFeedback} />
        </>
      ) : (
        <>
          <div className="scorebox">
            <span className="score">{cafe.work.toFixed(1)}</span>
            <span className="scorelabel">/ 5 for working</span>
          </div>
          <div className="bar" aria-label={`Working score ${cafe.work} out of 5`}>
            <span style={{ width: `${(cafe.work / 5) * 100}%` }} />
          </div>
          <div className="rating-logic">
            <p className="k">Work score logic</p>
            <div>
              {ratingLogic.map((item) => (
                <span key={item.label}>
                  <b>{item.label}</b> {item.value}
                </span>
              ))}
            </div>
          </div>
        </>
      )}
      <div className="pricerow">
        <div>
          Price
          <b>
            {menuStatus === "loading"
              ? "Checking..."
              : menuInsights?.priceRange ?? formatGooglePrice(livePlace?.priceLevel) ?? cafe.price}
          </b>
        </div>
        <div>
          Coffee<b>{cafe.coffee}</b>
        </div>
        <div>
          Public rating<b>{livePlace?.rating ? `${livePlace.rating.toFixed(1)} (${livePlace.ratingCount ?? 0})` : "—"}</b>
        </div>
      </div>
      {menuInsights?.status === "found" && (
        <div className="menu-prices">
          <p className="k">From the official menu</p>
          {menuInsights.items.map((item) => (
            <div key={`${item.name}:${item.price}`}>
              <span>{item.name}</span>
              <b>{item.price}</b>
            </div>
          ))}
          <small>{menuInsights.note}</small>
        </div>
      )}
      <div className="commute-card">
        <p className="k">Commute</p>
        {commute ? (
          <>
            <strong>{commute.distanceMiles.toFixed(1)} mi away</strong>
            <span>{commute.walkMinutes} min walk · {commute.transitMinutes} min subway-ish</span>
          </>
        ) : (
          <>
            <strong>Estimate from your location</strong>
            <span>{locationCopy(locationStatus)}</span>
            <button className="mini-action" onClick={onRequestLocation} type="button">
              {locationStatus === "prompting" ? "Waiting..." : "Use my location"}
            </button>
          </>
        )}
      </div>
      {cafe.profiled !== false && <div className="specs">
        <Spec label="Noise" value={cafe.noise} />
        <Spec label="Peak crowd" value={cafe.peak} />
        <Spec label="Seating" value={cafe.seating} />
        <Spec label="Seating styles" value={cafe.seatingStyles.join(", ")} />
        <Spec label="Charging" value={cafe.charging} />
        <Spec label="Charging slots" value={cafe.chargingSlots} />
        <Spec label="WiFi" value={cafe.wifi} />
        <Spec label="Avg food cost" value={cafe.avgFoodCost} />
      </div>}
      <div className="dtags">
        {cafe.t.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <div className="detail-actions">
        <a className="maplink" href={livePlace?.mapsUrl ?? mapsUrl(cafe)} rel="noopener noreferrer" target="_blank">
          Open in Maps <span aria-hidden="true">→</span>
        </a>
        {livePlace?.website && (
          <a className="menulink" href={livePlace.website} rel="noopener noreferrer" target="_blank">
            Official website <span aria-hidden="true">↗</span>
          </a>
        )}
        <a className="menulink" href={menuInsights?.menuUrl ?? cafe.menuUrl} rel="noopener noreferrer" target="_blank">
          View menu <span aria-hidden="true">↗</span>
        </a>
      </div>
      <p className="seed">
        Google Places supplies live hours, public rating, address, price level, website and photography. Work score,
        outlets, seating, noise and crowd remain the curated Workabout NYC layer.
      </p>
    </div>
  );
}

function Spec({ label, value }: { label: string; value: string }) {
  return (
    <div className="spec">
      <p className="k">{label}</p>
      <p className="v">{value}</p>
    </div>
  );
}

function FeedbackPanel({
  initial,
  onSave,
}: {
  initial: WorkFeedback | null;
  onSave: (feedback: WorkFeedback) => Promise<void>;
}) {
  const [feedback, setFeedback] = useState<WorkFeedback>(
    initial ?? { outlets: "", seating: "", noise: "", calls: "", notes: "" },
  );
  const [saved, setSaved] = useState(Boolean(initial));
  const [status, setStatus] = useState<"idle" | "submitting" | "error">("idle");
  const [open, setOpen] = useState(false);

  function update(field: keyof WorkFeedback, value: string) {
    setFeedback((current) => ({ ...current, [field]: value }));
    setSaved(false);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setStatus("submitting");
    try {
      await onSave(feedback);
      setSaved(true);
      setStatus("idle");
    } catch (error) {
      console.error(error);
      setStatus("error");
    }
  }

  if (!open) {
    return (
      <button className="contribute-rating" onClick={() => setOpen(true)} type="button">
        <span>Contribute rating</span>
        <small>{initial ? "Update community details" : "Outlets · seating · noise · calls"}</small>
      </button>
    );
  }

  return (
    <form className="feedback-panel" onSubmit={submit}>
      <div className="feedback-heading">
        <strong>{initial ? "Community work profile" : "Add work details"}</strong>
        <span>
          {status === "error"
            ? "Could not submit. Try again."
            : saved
              ? "Submitted for review"
              : "Community submitted"}
        </span>
      </div>
      <div className="feedback-grid">
        <label>
          Outlets
          <select value={feedback.outlets} onChange={(event) => update("outlets", event.target.value)} required>
            <option value="">Select</option>
            <option>Plenty</option>
            <option>Some</option>
            <option>Scarce</option>
            <option>None</option>
          </select>
        </label>
        <label>
          Seating
          <select value={feedback.seating} onChange={(event) => update("seating", event.target.value)} required>
            <option value="">Select</option>
            <option>Tables</option>
            <option>Communal</option>
            <option>Counter</option>
            <option>Sofas</option>
            <option>Cubbies</option>
          </select>
        </label>
        <label>
          Noise
          <select value={feedback.noise} onChange={(event) => update("noise", event.target.value)} required>
            <option value="">Select</option>
            <option>Quiet</option>
            <option>Moderate</option>
            <option>Loud</option>
          </select>
        </label>
        <label>
          Calls
          <select value={feedback.calls} onChange={(event) => update("calls", event.target.value)} required>
            <option value="">Select</option>
            <option>Okay</option>
            <option>Short calls only</option>
            <option>Not appropriate</option>
          </select>
        </label>
      </div>
      <label className="feedback-notes">
        Notes
        <input
          value={feedback.notes}
          onChange={(event) => update("notes", event.target.value)}
          placeholder="Wi-Fi, time limits, best seats"
          maxLength={500}
        />
      </label>
      <button className="mini-action" type="submit" disabled={status === "submitting"}>
        {status === "submitting" ? "Submitting..." : saved ? "Submitted" : initial ? "Update details" : "Submit details"}
      </button>
    </form>
  );
}

function TokenWarning() {
  return (
    <div className="tokenwarn">
      <h2>Add your Mapbox token</h2>
      <p>
        Add a <code>VITE_MAPBOX_TOKEN</code> value in <code>.env.local</code> locally and in Vercel Project Settings.
      </p>
    </div>
  );
}

function MapFailure({ message }: { message: string }) {
  return (
    <div className="tokenwarn" role="alert">
      <h2>Workabout NYC</h2>
      <p>{message}</p>
      <p>Try the latest Chrome, Safari, Firefox, or Edge without strict graphics blocking.</p>
    </div>
  );
}

function readCommunityProfiles(): Record<string, WorkFeedback> {
  try {
    const current = window.localStorage.getItem("workabout-nyc-community-profiles");
    const legacy = window.localStorage.getItem("workout-nyc-community-profiles");
    return JSON.parse(current ?? legacy ?? "{}") as Record<
      string,
      WorkFeedback
    >;
  } catch {
    return {};
  }
}

function getContributorId() {
  const storageKey = "workabout-nyc-contributor-id";
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const id = crypto.randomUUID();
  window.localStorage.setItem(storageKey, id);
  return id;
}

function readWorkabilityAnalyses(): Record<string, WorkabilityAnalysis> {
  try {
    return JSON.parse(window.localStorage.getItem("workabout-nyc-claude-scores") ?? "{}") as Record<
      string,
      WorkabilityAnalysis
    >;
  } catch {
    return {};
  }
}

function persistWorkabilityAnalysis(
  current: Record<string, WorkabilityAnalysis>,
  key: string,
  analysis: WorkabilityAnalysis,
) {
  const next = { ...current, [key]: analysis };
  window.localStorage.setItem("workabout-nyc-claude-scores", JSON.stringify(next));
  return next;
}

function locationCopy(status: LocationStatus) {
  if (status === "ready") return "Location enabled. Commute estimates show inside each selected spot.";
  if (status === "prompting") return "Check the browser prompt and choose Allow.";
  if (status === "blocked") return "Location is blocked for this site. Enable it in Arc site controls, then try again.";
  if (status === "timeout") return "The browser did not return a location. Check location services and try again.";
  if (status === "unavailable") return "Your current location is unavailable.";
  if (status === "unsupported") return "This browser does not support location access.";
  return "Optional. Used only for local commute estimates after browser approval.";
}

function getCommute(cafe: Cafe, location: UserLocation) {
  const distanceMiles = haversineMiles(location.lat, location.lng, cafe.lat, cafe.lng);
  const walkMinutes = Math.max(3, Math.round(distanceMiles * 20));
  const transitMinutes = Math.max(8, Math.round(distanceMiles * 7 + 8));
  return { distanceMiles, walkMinutes, transitMinutes };
}

function haversineMiles(lat1: number, lng1: number, lat2: number, lng2: number) {
  const radius = 3958.8;
  const toRad = (value: number) => (value * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function discoveredPlaceToCafe(place: GoogleCafeSummary): Cafe {
  return {
    profiled: false,
    openNow: place.openNow,
    placeId: place.id,
    address: place.address,
    n: place.name,
    h: place.neighborhood,
    b: place.borough,
    lng: place.lng,
    lat: place.lat,
    work: 0,
    price: "—",
    coffee: "Live details",
    food: "Live details",
    noise: "Not profiled",
    peak: "Not profiled",
    seating: "Not profiled",
    charging: "Not profiled",
    chargingSlots: "Not profiled",
    wifi: "Not profiled",
    seatingStyles: [],
    avgFoodCost: "Not profiled",
    menuUrl: place.mapsUrl ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name)}`,
    hours: [null, null, null, null, null, null, null],
    t: [],
  };
}

function toUniqueDiscoveredCafes(places: GoogleCafeSummary[]) {
  return places
    .filter(
      (place) =>
        !CAFES.some(
          (cafe) =>
            haversineMiles(cafe.lat, cafe.lng, place.lat, place.lng) < 0.08 ||
            cafe.n.toLowerCase() === place.name.toLowerCase(),
        ),
    )
    .map(discoveredPlaceToCafe);
}

function cafeKey(cafe: Cafe) {
  return `${cafe.n}:${cafe.lat.toFixed(5)}:${cafe.lng.toFixed(5)}`;
}

function matchesEvidenceFilter(
  cafe: Cafe,
  tag: CafeTag,
  analysis: WorkabilityAnalysis | null,
  community: WorkFeedback | null,
) {
  if (cafe.profiled !== false) return matchesFilterTag(cafe, tag);
  if (tag === "Open now") return cafe.openNow === true;

  if (community) {
    if (tag === "Outlets" && ["Plenty", "Some", "Scarce"].includes(community.outlets)) return true;
    if (tag === "Outlet heavy" && community.outlets === "Plenty") return true;
    if (tag === "Couches" && community.seating === "Sofas") return true;
    if (tag === "Calls ok" && community.calls === "Okay") return true;
    if (tag === "Quiet" && community.noise === "Quiet") return true;
  }

  const evidence = [
    analysis?.verdict,
    ...(analysis?.evidence ?? []),
    ...(analysis?.caveats ?? []),
    community?.outlets,
    community?.seating,
    community?.noise,
    community?.calls,
    community?.notes,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  if (!evidence) return false;

  const has = (...phrases: string[]) => phrases.some((phrase) => evidence.includes(phrase));
  const outletPositive = has("outlet", "power", "plug") && !has("no outlet", "without outlet", "outlets unavailable");

  if (tag === "Outlets") return outletPositive;
  if (tag === "Outlet heavy") return outletPositive && has("plenty", "abundant", "many outlet", "strong power");
  if (tag === "Fast WiFi") return has("fast wi-fi", "fast wifi", "reliable wi-fi", "reliable wifi", "strong wi-fi", "strong wifi");
  if (tag === "Roomy") return has("spacious", "roomy", "ample seating", "large space", "many seats");
  if (tag === "No time limit") return has("no time limit", "long stay", "extended session", "linger");
  if (tag === "Couches") return has("couch", "sofa", "lounge seating");
  if (tag === "Outdoor") return has("outdoor", "patio", "garden seating");
  if (tag === "Calls ok") return has("calls okay", "calls ok", "call-friendly", "suitable for calls");
  if (tag === "Quiet") return has("quiet", "low noise", "calm") && !has("not quiet", "loud");
  if (tag === "Long session") return has("long session", "extended laptop", "long stay", "linger") || (analysis?.score ?? 0) >= 4.3;
  if (tag === "Food meal") return has("full menu", "meal", "kitchen", "lunch", "breakfast");
  return false;
}

function popupHtml(cafe: Cafe, selected: boolean, livePlace: GooglePlace | null = null) {
  if (selected) {
    const score = cafe.profiled === false ? "AI workability" : `${cafe.work.toFixed(1)} workability`;
    return `<div class="pop selected">
      <div class="pn">${cafe.n}</div>
      <div class="selected-meta"><span>${cafe.h}</span><b>${score}</b></div>
    </div>`;
  }

  const status = livePlace
    ? livePlace.openNow
      ? "Open now"
      : "Closed now"
    : cafe.profiled === false
      ? cafe.openNow === true
        ? "Open now"
        : cafe.openNow === false
          ? "Closed now"
          : "Hours unavailable"
    : getOpenStatus(cafe).label;
  return `<div class="pop">
    <div class="pn">${livePlace?.name ?? cafe.n}</div>
    <div class="ph">${livePlace?.address ?? cafe.h}</div>
    <div class="pr"><span>Status</span><b>${status}</b></div>
    ${livePlace?.rating ? `<div class="pr"><span>Public rating</span><b>${livePlace.rating.toFixed(1)} · ${livePlace.ratingCount ?? 0} reviews</b></div>` : ""}
    ${cafe.profiled === false ? "" : `<div class="pr"><span>Work score</span><b>${cafe.work.toFixed(1)} / 5</b></div>`}
    ${cafe.profiled === false && !livePlace ? "" : `<div class="pr"><span>Price</span><b>${formatGooglePrice(livePlace?.priceLevel) ?? cafe.price}</b></div>`}
    ${cafe.profiled === false && !livePlace ? "" : `<div class="pr"><span>Coffee / food</span><b>${cafe.coffee} · ${cafe.food}</b></div>`}
    <div class="hint">Click for full details</div>
  </div>`;
}

function placePhotoUrl(livePlace: GooglePlace) {
  return `/api/place-photo?name=${encodeURIComponent(livePlace.photoName ?? "")}`;
}

function formatGooglePrice(priceLevel: string | null | undefined) {
  const levels: Record<string, string> = {
    PRICE_LEVEL_FREE: "Free",
    PRICE_LEVEL_INEXPENSIVE: "$",
    PRICE_LEVEL_MODERATE: "$$",
    PRICE_LEVEL_EXPENSIVE: "$$$",
    PRICE_LEVEL_VERY_EXPENSIVE: "$$$$",
  };
  return priceLevel ? levels[priceLevel] ?? null : null;
}

function todayHours(hours: string[]) {
  const day = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "America/New_York" }).format(new Date());
  return hours.find((entry) => entry.startsWith(day))?.replace(`${day}: `, "") ?? "";
}

function getNYCTimeTheme(): TimeTheme {
  const formatter = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: "America/New_York",
  });
  const hour = Number(formatter.format(new Date()));
  if (hour >= 5 && hour < 8) return "dawn";
  if (hour >= 8 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "dusk";
  return "night";
}

function readShareState() {
  const params = new URLSearchParams(window.location.search);
  const area = params.get("area");
  const validArea = area && NEIGHBORHOODS.some((place) => place.label === area)
    ? area
    : null;
  const tags = (params.get("filters") ?? "")
    .split(",")
    .filter((tag): tag is CafeTag => TAGS.includes(tag as CafeTag));
  return { area: validArea, cafe: params.get("cafe"), tags };
}

function findBestNearby(
  cafes: Cafe[],
  location: UserLocation,
  analyses: Record<string, WorkabilityAnalysis>,
) {
  const openCafes = cafes.filter((cafe) =>
    cafe.profiled === false ? cafe.openNow !== false : getOpenStatus(cafe).open,
  );
  const candidates = openCafes.length ? openCafes : cafes;
  return candidates.reduce<Cafe | null>((best, cafe) => {
    if (!best) return cafe;
    const score = (analyses[cafeKey(cafe)]?.score ?? cafe.work ?? 2.5)
      - haversineMiles(location.lat, location.lng, cafe.lat, cafe.lng) * 0.42;
    const bestScore = (analyses[cafeKey(best)]?.score ?? best.work ?? 2.5)
      - haversineMiles(location.lat, location.lng, best.lat, best.lng) * 0.42;
    return score > bestScore ? cafe : best;
  }, null);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
