import OpenAI from "openai";

export type ListingRow = {
  id: string;
  external_url: string | null;
  title: string | null;
  price_ils: number | null;
  bedrooms: number | null;
  sqm: number | null;
  neighborhood: string | null;
  image_urls: string[];
  amenities: unknown;
  scraped_at: string | null;
  is_agency: boolean | null;
};

export type RankedListing = ListingRow & { match_explanation: string };

export type TenantProfile = {
  budget_max?: number | null;
  bedrooms?: number | null;
  neighborhoods?: string[];
  lifestyle_signals?: Record<string, unknown>;
};

export function hardFilter(listings: ListingRow[], profile: TenantProfile): ListingRow[] {
  return listings.filter((listing) => {
    if (profile.budget_max != null && listing.price_ils != null) {
      if (listing.price_ils > profile.budget_max) return false;
    }
    if (profile.bedrooms != null && listing.bedrooms != null) {
      if (Number(listing.bedrooms) !== profile.bedrooms) return false;
    }
    if (profile.neighborhoods && profile.neighborhoods.length > 0 && listing.neighborhood != null) {
      if (!profile.neighborhoods.includes(listing.neighborhood)) return false;
    }
    return true;
  });
}

const RANK_SYSTEM_PROMPT = `You are a rental matching assistant for English-speaking immigrants in Israel.
Given a tenant's lifestyle profile and a list of rental listings, rank the listings by lifestyle fit and provide a short (1-2 sentence) match explanation for each.

Return a JSON object with a "rankings" key containing an array of objects with exactly these fields:
- id: the listing id (string)
- match_explanation: 1-2 sentences explaining why this listing fits the tenant's lifestyle (must reference at least one detail from their profile)

Sort the rankings array by best fit first.
Return ONLY valid JSON. No markdown, no explanation.`;

export async function rankWithAI(
  listings: ListingRow[],
  profile: TenantProfile
): Promise<RankedListing[]> {
  if (listings.length === 0) return [];

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

  const summaries = listings.map((l) => ({
    id: l.id,
    price: l.price_ils,
    bedrooms: l.bedrooms,
    area_sqm: l.sqm,
    neighborhood: l.neighborhood,
    title: l.title,
  }));

  const userMessage = `Tenant lifestyle signals: ${JSON.stringify(profile.lifestyle_signals ?? {})}

Listings:
${JSON.stringify(summaries, null, 2)}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: RANK_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.3,
    });

    const raw = response.choices[0]?.message?.content ?? "{}";
    const parsed = JSON.parse(raw) as { rankings?: Array<{ id: string; match_explanation: string }> };
    const rankings = Array.isArray(parsed.rankings) ? parsed.rankings : [];

    const explanationMap = new Map(rankings.map((r) => [r.id, r.match_explanation]));
    const listingMap = new Map(listings.map((l) => [l.id, l]));

    const ranked: RankedListing[] = [];
    for (const { id } of rankings) {
      const listing = listingMap.get(id);
      if (listing) {
        ranked.push({
          ...listing,
          match_explanation: explanationMap.get(id) ?? "Good match for your preferences.",
        });
      }
    }

    // Append any listings not included in the AI response
    for (const listing of listings) {
      if (!explanationMap.has(listing.id)) {
        ranked.push({ ...listing, match_explanation: "Good match for your preferences." });
      }
    }

    return ranked;
  } catch {
    return listings.map((l) => ({ ...l, match_explanation: "Good match for your preferences." }));
  }
}
