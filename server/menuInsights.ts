import Anthropic from "@anthropic-ai/sdk";
import { load } from "cheerio";

export type MenuInsights = {
  status: "found" | "unavailable";
  priceRange: string | null;
  items: Array<{ name: string; price: string }>;
  menuUrl: string | null;
  note: string;
};

export async function findMenuInsights(
  anthropicApiKey: string,
  input: { name: string; website: string },
): Promise<MenuInsights> {
  const startUrl = safePublicUrl(input.website);
  if (!startUrl) return unavailable("No usable official website was found.");

  const first = await fetchPage(startUrl);
  const $ = load(first.html);
  const menuHref = $("a")
    .toArray()
    .map((element) => ({
      href: $(element).attr("href"),
      label: $(element).text().trim().toLowerCase(),
    }))
    .find((link) => link.href && /(menu|coffee|food|order)/.test(link.label))?.href;

  let menuUrl = startUrl.toString();
  let sourceText = visibleText($);
  if (menuHref) {
    const candidate = safePublicUrl(new URL(menuHref, startUrl).toString());
    if (candidate) {
      try {
        const menuPage = await fetchPage(candidate);
        menuUrl = candidate.toString();
        sourceText = visibleText(load(menuPage.html));
      } catch {
        // The official home page remains usable evidence.
      }
    }
  }

  if (!/[$€£]\s?\d|\d+\.\d{2}/.test(sourceText)) {
    return { ...unavailable("The official site does not expose readable menu prices."), menuUrl };
  }

  const client = new Anthropic({ apiKey: anthropicApiKey });
  const model = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5-20250929";
  const message = await client.messages.create({
    model,
    max_tokens: 500,
    temperature: 0,
    system: `Extract cafe prices only from the supplied official-site text. Never infer or estimate.
Return only JSON: {"priceRange":string|null,"items":[{"name":string,"price":string}],"note":string}.
Include at most 4 representative coffee/food items. If evidence is insufficient, use null and an empty list.`,
    messages: [{
      role: "user",
      content: `Cafe: ${input.name}\nOfficial page: ${menuUrl}\nText:\n${sourceText.slice(0, 28000)}`,
    }],
  });
  const text = message.content.find((block) => block.type === "text");
  if (!text || text.type !== "text") return unavailable("Menu pricing could not be extracted.");
  const parsed = JSON.parse(text.text.replace(/^```json\s*|\s*```$/g, "")) as {
    priceRange?: string | null;
    items?: Array<{ name?: string; price?: string }>;
    note?: string;
  };
  const items = (parsed.items ?? [])
    .filter((item): item is { name: string; price: string } => Boolean(item.name && item.price))
    .slice(0, 4);

  return {
    status: parsed.priceRange || items.length ? "found" : "unavailable",
    priceRange: parsed.priceRange?.slice(0, 40) ?? null,
    items: items.map((item) => ({
      name: item.name.slice(0, 80),
      price: item.price.slice(0, 20),
    })),
    menuUrl,
    note: (parsed.note ?? "Prices from the official cafe website.").slice(0, 180),
  };
}

function unavailable(note: string): MenuInsights {
  return { status: "unavailable", priceRange: null, items: [], menuUrl: null, note };
}

function safePublicUrl(value: string) {
  try {
    const url = new URL(value);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    const host = url.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host === "0.0.0.0" ||
      host === "::1" ||
      host.startsWith("127.") ||
      host.startsWith("10.") ||
      host.startsWith("192.168.") ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    ) return null;
    return url;
  } catch {
    return null;
  }
}

async function fetchPage(url: URL) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(6500),
    headers: { "User-Agent": "WorkaboutNYC/1.0 menu preview" },
  });
  if (!response.ok) throw new Error(`Official website returned ${response.status}`);
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("text/html")) throw new Error("Official menu is not readable HTML");
  const html = (await response.text()).slice(0, 180000);
  return { html };
}

function visibleText($: ReturnType<typeof load>) {
  $("script, style, svg, noscript").remove();
  return $("body").text().replace(/\s+/g, " ").trim();
}
