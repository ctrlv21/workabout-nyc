export type Cafe = {
  profiled?: boolean;
  openNow?: boolean | null;
  placeId?: string;
  address?: string;
  n: string;
  h: string;
  b: "Manhattan" | "Brooklyn";
  lng: number;
  lat: number;
  work: number;
  price: string;
  coffee: string;
  food: string;
  noise: string;
  peak: string;
  seating: string;
  charging: string;
  chargingSlots: string;
  wifi: string;
  seatingStyles: string[];
  avgFoodCost: string;
  menuUrl: string;
  photoUrl?: string;
  hours: WeeklyHours;
  confidence?: Confidence;
  t: CafeTag[];
};

export type Confidence = "visited" | "community submitted";

export const WORK_MODE_TAGS = ["Calls ok", "Quiet", "Long session", "Food meal", "Outlet heavy"] as const;

export const TAGS = [
  "Outlets",
  "Fast WiFi",
  "Roomy",
  "No time limit",
  "Couches",
  "Outdoor",
  "Open now",
  ...WORK_MODE_TAGS,
] as const;

export type CafeTag = (typeof TAGS)[number];
export type WorkModeTag = (typeof WORK_MODE_TAGS)[number];
export type Borough = Cafe["b"];
export type DayHours = { open: string; close: string } | null;
export type WeeklyHours = [DayHours, DayHours, DayHours, DayHours, DayHours, DayHours, DayHours];

const daily = (open: string, close: string): WeeklyHours => [
  { open, close },
  { open, close },
  { open, close },
  { open, close },
  { open, close },
  { open, close },
  { open, close },
];

const weekdayWeekend = (weekdayOpen: string, weekdayClose: string, weekendOpen: string, weekendClose: string): WeeklyHours => [
  { open: weekendOpen, close: weekendClose },
  { open: weekdayOpen, close: weekdayClose },
  { open: weekdayOpen, close: weekdayClose },
  { open: weekdayOpen, close: weekdayClose },
  { open: weekdayOpen, close: weekdayClose },
  { open: weekdayOpen, close: weekdayClose },
  { open: weekendOpen, close: weekendClose },
];

export const CAFES: Cafe[] = [
  { n: "Bibliotheque", h: "East Village", b: "Manhattan", lng: -73.9842, lat: 40.7262, work: 4.8, price: "$$", coffee: "$5", food: "Light bites", noise: "Low to medium", peak: "1-3pm weekends", seating: "Tables, power at each", charging: "Plenty", chargingSlots: "Most tables have nearby power", wifi: "Fast, handles calls", seatingStyles: ["two-tops", "communal tables", "quiet corners"], avgFoodCost: "$9-15", menuUrl: "https://www.google.com/search?q=Bibliotheque+East+Village+menu", hours: daily("08:00", "22:00"), t: ["Outlets", "Fast WiFi", "No time limit"] },
  { n: "The Bean", h: "East Village", b: "Manhattan", lng: -73.9861, lat: 40.7291, work: 4.0, price: "$$", coffee: "$4.50", food: "Pastries", noise: "Medium", peak: "12-2pm weekdays", seating: "Tables + counter", charging: "Some", chargingSlots: "Scattered wall outlets", wifi: "OK", seatingStyles: ["cafe tables", "window counter", "bench seats"], avgFoodCost: "$6-12", menuUrl: "https://www.google.com/search?q=The+Bean+East+Village+menu", hours: daily("07:00", "20:00"), t: ["Outlets", "Roomy"] },
  { n: "787 Coffee", h: "East Village", b: "Manhattan", lng: -73.9822, lat: 40.7276, work: 4.2, price: "$$", coffee: "$5", food: "Light", noise: "Medium", peak: "Afternoons", seating: "Tables, exposed brick", charging: "Plenty", chargingSlots: "Good outlet coverage along walls", wifi: "Fast", seatingStyles: ["small tables", "counter", "wall banquette"], avgFoodCost: "$6-11", menuUrl: "https://www.google.com/search?q=787+Coffee+East+Village+menu", hours: daily("07:00", "19:00"), t: ["Outlets", "Fast WiFi"] },
  { n: "Joe Coffee (LaGuardia Pl)", h: "Greenwich Village", b: "Manhattan", lng: -73.9981, lat: 40.7283, work: 3.9, price: "$$", coffee: "$4.75", food: "Pastries", noise: "Medium", peak: "Mornings", seating: "Tables", charging: "Some", chargingSlots: "A few perimeter outlets", wifi: "OK", seatingStyles: ["two-tops", "shared table"], avgFoodCost: "$5-10", menuUrl: "https://www.google.com/search?q=Joe+Coffee+LaGuardia+Place+menu", hours: daily("07:00", "19:00"), t: ["Outlets"] },
  { n: "Stumptown Coffee", h: "Greenwich Village", b: "Manhattan", lng: -73.9894, lat: 40.7312, work: 4.0, price: "$$", coffee: "$5", food: "Pastries", noise: "Medium", peak: "Mornings", seating: "Limited tables", charging: "Scarce", chargingSlots: "Bring a charged laptop", wifi: "Fast", seatingStyles: ["small tables", "standing ledge"], avgFoodCost: "$5-12", menuUrl: "https://www.google.com/search?q=Stumptown+Coffee+NYC+menu", hours: daily("07:00", "18:00"), t: ["Fast WiFi"] },
  { n: "Ground Central", h: "Midtown", b: "Manhattan", lng: -73.9802, lat: 40.7541, work: 4.3, price: "$$", coffee: "$5", food: "Light", noise: "Medium", peak: "Lunch", seating: "Couches + tables", charging: "Some", chargingSlots: "Some outlets near lounge seats", wifi: "Fast", seatingStyles: ["sofas", "cafe tables", "library chairs"], avgFoodCost: "$7-14", menuUrl: "https://www.google.com/search?q=Ground+Central+Midtown+menu", hours: weekdayWeekend("07:00", "20:00", "08:00", "19:00"), t: ["Couches", "Fast WiFi"] },
  { n: "Coffee Project NY", h: "Chelsea", b: "Manhattan", lng: -74.0031, lat: 40.7442, work: 4.1, price: "$$", coffee: "$5.50", food: "Light", noise: "Low", peak: "Afternoons", seating: "Designed tables", charging: "Some", chargingSlots: "Limited outlets, choose wall seats", wifi: "Fast", seatingStyles: ["design tables", "bench seating", "counter"], avgFoodCost: "$8-14", menuUrl: "https://www.google.com/search?q=Coffee+Project+NY+Chelsea+menu", hours: daily("08:00", "18:00"), t: ["Roomy"] },
  { n: "Telegraphe Cafe", h: "Chelsea", b: "Manhattan", lng: -74.0012, lat: 40.7461, work: 4.4, price: "$$", coffee: "$4.75", food: "Pastries", noise: "Low", peak: "Flexible", seating: "Small tables", charging: "Some", chargingSlots: "A few reliable wall outlets", wifi: "OK", seatingStyles: ["small tables", "window seats"], avgFoodCost: "$6-13", menuUrl: "https://www.google.com/search?q=Telegraphe+Cafe+Chelsea+menu", hours: daily("07:30", "18:00"), t: ["No time limit"] },
  { n: "Variety Coffee", h: "Chelsea", b: "Manhattan", lng: -74.0003, lat: 40.7433, work: 3.8, price: "$$", coffee: "$4.50", food: "Pastries", noise: "High", peak: "Most days, go early", seating: "Tables, busy", charging: "Scarce", chargingSlots: "Outlet access is hit or miss", wifi: "Fast", seatingStyles: ["cafe tables", "bench seats"], avgFoodCost: "$5-10", menuUrl: "https://www.google.com/search?q=Variety+Coffee+Chelsea+menu", hours: daily("07:00", "19:00"), t: ["Fast WiFi"] },
  { n: "The Granola Bar", h: "Upper West Side", b: "Manhattan", lng: -73.9762, lat: 40.7871, work: 4.0, price: "$$$", coffee: "$5", food: "Full menu", noise: "Medium", peak: "Brunch", seating: "Tables + booths", charging: "Some", chargingSlots: "Some outlets near booths", wifi: "Fast", seatingStyles: ["booths", "dining tables", "bar seats"], avgFoodCost: "$16-28", menuUrl: "https://www.google.com/search?q=The+Granola+Bar+Upper+West+Side+menu", hours: daily("08:00", "21:00"), t: ["Fast WiFi", "Roomy"] },
  { n: "Capital One Cafe", h: "Columbus Circle", b: "Manhattan", lng: -73.9821, lat: 40.7681, work: 4.5, price: "$", coffee: "Free to $4", food: "Peet's cafe", noise: "Medium", peak: "Weekdays", seating: "Work areas, banquettes", charging: "Plenty", chargingSlots: "Dedicated work power throughout", wifi: "Fast", seatingStyles: ["work cubbies", "banquettes", "communal tables"], avgFoodCost: "$4-10", menuUrl: "https://www.google.com/search?q=Capital+One+Cafe+Columbus+Circle+menu", hours: daily("08:00", "18:00"), t: ["Outlets", "No time limit"] },
  { n: "Seven Grams Cafe", h: "Flatiron", b: "Manhattan", lng: -73.9901, lat: 40.7411, work: 3.9, price: "$$", coffee: "$5", food: "Light", noise: "Medium", peak: "Mornings", seating: "Counter + tables", charging: "Some", chargingSlots: "Counter outlets plus a few wall seats", wifi: "OK", seatingStyles: ["counter", "two-tops", "bench seats"], avgFoodCost: "$7-14", menuUrl: "https://www.google.com/search?q=Seven+Grams+Cafe+Flatiron+menu", hours: daily("07:00", "18:00"), t: ["Outlets"] },
  { n: "NBHD Brulee", h: "Harlem", b: "Manhattan", lng: -73.9452, lat: 40.8101, work: 4.2, price: "$$", coffee: "$5", food: "Pastries", noise: "Low", peak: "Afternoons", seating: "Tables + enclosed porch", charging: "Plenty", chargingSlots: "Good power inside", wifi: "Fast", seatingStyles: ["cafe tables", "enclosed porch", "outdoor seats"], avgFoodCost: "$6-12", menuUrl: "https://www.google.com/search?q=NBHD+Brulee+Harlem+menu", hours: daily("08:00", "19:00"), t: ["Outlets", "Outdoor"] },
  { n: "Partners Coffee", h: "Williamsburg", b: "Brooklyn", lng: -73.9571, lat: 40.7142, work: 4.1, price: "$$", coffee: "$5", food: "Light", noise: "Medium", peak: "Weekends", seating: "Spacious tables", charging: "Some", chargingSlots: "Some wall access", wifi: "Fast", seatingStyles: ["communal tables", "two-tops", "bench seats"], avgFoodCost: "$7-15", menuUrl: "https://www.google.com/search?q=Partners+Coffee+Williamsburg+menu", hours: daily("07:00", "18:00"), t: ["Roomy"] },
  { n: "K'Far (Hoxton lobby)", h: "Williamsburg", b: "Brooklyn", lng: -73.9611, lat: 40.7221, work: 4.3, price: "$$$", coffee: "$5.50", food: "Full menu", noise: "Medium", peak: "Lunch", seating: "Lobby chairs + tables", charging: "Plenty", chargingSlots: "Hotel-lobby outlet coverage", wifi: "Fast", seatingStyles: ["sofas", "lobby chairs", "dining tables"], avgFoodCost: "$14-30", menuUrl: "https://www.google.com/search?q=KFar+Hoxton+Williamsburg+menu", hours: daily("07:00", "21:00"), t: ["Outlets", "Couches"] },
  { n: "Odd Fox", h: "Greenpoint", b: "Brooklyn", lng: -73.9511, lat: 40.7301, work: 4.2, price: "$$", coffee: "$5", food: "Pastries", noise: "Low", peak: "Mornings", seating: "Indoor + outdoor", charging: "Some", chargingSlots: "Some indoor wall outlets", wifi: "Fast", seatingStyles: ["small tables", "outdoor seats", "window seats"], avgFoodCost: "$6-12", menuUrl: "https://www.google.com/search?q=Odd+Fox+Greenpoint+menu", hours: daily("07:30", "18:00"), t: ["Outdoor", "Roomy"] },
  { n: "Hungry Ghost Coffee", h: "Fort Greene", b: "Brooklyn", lng: -73.9751, lat: 40.6891, work: 4.4, price: "$$", coffee: "$4.75", food: "Light", noise: "Medium", peak: "Afternoons", seating: "Tables, couches, counter", charging: "Plenty", chargingSlots: "Good outlets by counter and lounge", wifi: "Fast", seatingStyles: ["sofas", "counter", "cafe tables"], avgFoodCost: "$6-13", menuUrl: "https://www.google.com/search?q=Hungry+Ghost+Coffee+Fort+Greene+menu", hours: daily("07:00", "19:00"), t: ["Outlets", "Couches", "Fast WiFi"] },
  { n: "Devocion", h: "Williamsburg", b: "Brooklyn", lng: -73.9572, lat: 40.7152, work: 4.6, price: "$$", coffee: "$5.50", food: "Light", noise: "Medium", peak: "Weekends", seating: "Tons of seating, skylight", charging: "Some", chargingSlots: "Some perimeter outlets", wifi: "Fast", seatingStyles: ["communal tables", "sofas", "skylight atrium"], avgFoodCost: "$7-15", menuUrl: "https://www.google.com/search?q=Devocion+Williamsburg+menu", hours: daily("08:00", "19:00"), t: ["Roomy", "Fast WiFi"] },
];

const PHOTO_POOL = [
  "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1521017432531-fbd92d768814?auto=format&fit=crop&w=900&q=80",
  "https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=900&q=80",
];

export function getCafePhoto(cafe: Cafe) {
  if (cafe.photoUrl) return cafe.photoUrl;
  const index = Math.abs([...cafe.n].reduce((sum, char) => sum + char.charCodeAt(0), 0)) % PHOTO_POOL.length;
  return PHOTO_POOL[index];
}

export function getRatingLogic(cafe: Cafe) {
  const logic = [
    { label: "Power", value: cafe.charging.toLowerCase().includes("plenty") ? "strong" : cafe.charging.toLowerCase().includes("some") ? "medium" : "weak" },
    { label: "WiFi", value: cafe.wifi.toLowerCase().includes("fast") ? "fast" : "basic" },
    { label: "Stay", value: cafe.t.includes("No time limit") || cafe.work >= 4.4 ? "long-session friendly" : "moderate" },
    { label: "Noise", value: cafe.noise.toLowerCase().includes("low") ? "quiet" : cafe.noise.toLowerCase().includes("high") ? "loud" : "medium" },
    { label: "Seating", value: cafe.seatingStyles.slice(0, 2).join(" / ") },
  ];
  return logic;
}

export function mapsUrl(cafe: Cafe) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    `${cafe.n} ${cafe.h} New York`,
  )}`;
}

export function getOpenStatus(cafe: Cafe, at = new Date()) {
  if (cafe.profiled === false && typeof cafe.openNow === "boolean") {
    return {
      open: cafe.openNow,
      label: cafe.openNow ? "Open now" : "Closed now",
      today: "Live Google status",
    };
  }
  const day = cafe.hours[at.getDay()];
  if (!day) return { open: false, label: "Closed today", today: "Closed" };

  const now = at.getHours() * 60 + at.getMinutes();
  const open = timeToMinutes(day.open);
  const close = timeToMinutes(day.close);
  const isOpen = close > open ? now >= open && now < close : now >= open || now < close;

  return {
    open: isOpen,
    label: isOpen ? `Open until ${formatTime(day.close)}` : `Closed · opens ${formatTime(day.open)}`,
    today: `${formatTime(day.open)}-${formatTime(day.close)}`,
  };
}

export function getConfidence(cafe: Cafe): Confidence | null {
  if (cafe.confidence) return cafe.confidence;
  if (["Bibliotheque", "Capital One Cafe", "Hungry Ghost Coffee", "Devocion"].includes(cafe.n)) return "visited";
  if (cafe.n.includes("Hoxton") || cafe.n === "NBHD Brulee") return "community submitted";
  return null;
}

export function matchesFilterTag(cafe: Cafe, tag: CafeTag) {
  if (tag === "Open now") return getOpenStatus(cafe).open;
  if (tag === "Calls ok") return cafe.wifi.toLowerCase().includes("fast") && !cafe.noise.toLowerCase().includes("high");
  if (tag === "Quiet") return cafe.noise.toLowerCase().includes("low");
  if (tag === "Long session") return cafe.t.includes("No time limit") || cafe.work >= 4.4;
  if (tag === "Food meal") return cafe.food.toLowerCase().includes("full") || cafe.avgFoodCost.includes("28") || cafe.avgFoodCost.includes("30");
  if (tag === "Outlet heavy") return cafe.charging.toLowerCase().includes("plenty") || cafe.chargingSlots.toLowerCase().includes("throughout");
  return cafe.t.includes(tag);
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTime(value: string) {
  const [rawHours, minutes] = value.split(":").map(Number);
  const suffix = rawHours >= 12 ? "PM" : "AM";
  const hours = rawHours % 12 || 12;
  return `${hours}:${String(minutes).padStart(2, "0")} ${suffix}`;
}
