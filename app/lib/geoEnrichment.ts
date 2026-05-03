export type Amenity = { name: string; distance: number };

export type GeoEnrichment = {
  parks: Amenity[];
  cafes: Amenity[];
  gyms: Amenity[];
  schools: Amenity[];
  supermarkets: Amenity[];
  pharmacies: Amenity[];
  bus_stops: Amenity[];
};

const EMPTY_GEO: GeoEnrichment = {
  parks: [],
  cafes: [],
  gyms: [],
  schools: [],
  supermarkets: [],
  pharmacies: [],
  bus_stops: [],
};

const FSQ_CATEGORIES: Record<keyof GeoEnrichment, string> = {
  parks: "16032",
  cafes: "13035",
  gyms: "18021",
  schools: "12058",
  supermarkets: "17069",
  pharmacies: "15014",
  bus_stops: "19006",
};

type FoursquarePlace = { name: string; distance: number };
type FoursquareResponse = { results: FoursquarePlace[] };

async function fetchCategory(
  lat: number,
  lng: number,
  categoryId: string,
  radiusMeters: number,
  apiKey: string,
  limit = 5
): Promise<Amenity[]> {
  const url = new URL("https://api.foursquare.com/v3/places/search");
  url.searchParams.set("ll", `${lat},${lng}`);
  url.searchParams.set("radius", String(radiusMeters));
  url.searchParams.set("categories", categoryId);
  url.searchParams.set("fields", "name,distance");
  url.searchParams.set("limit", String(limit));

  const res = await fetch(url.toString(), {
    headers: { Authorization: apiKey },
  });

  if (!res.ok) {
    throw new Error(`Foursquare API error: ${res.status}`);
  }

  const data = (await res.json()) as FoursquareResponse;
  return (data.results ?? []).map((r) => ({ name: r.name, distance: r.distance }));
}

export async function fetchGeoEnrichment(
  lat: number,
  lng: number,
  radiusMeters = 500,
  apiKey = process.env.FOURSQUARE_API_KEY ?? ""
): Promise<GeoEnrichment> {
  if (!apiKey) {
    return { ...EMPTY_GEO };
  }

  const entries = Object.entries(FSQ_CATEGORIES) as [keyof GeoEnrichment, string][];

  const results = await Promise.allSettled(
    entries.map(([, categoryId]) =>
      fetchCategory(lat, lng, categoryId, radiusMeters, apiKey)
    )
  );

  const enrichment: GeoEnrichment = { ...EMPTY_GEO };
  results.forEach((result, i) => {
    const key = entries[i][0];
    enrichment[key] = result.status === "fulfilled" ? result.value : [];
  });

  return enrichment;
}

import type { SupabaseClient } from "@supabase/supabase-js";

export async function enrichPendingListings(
  supabase: SupabaseClient,
  candidates: Array<{ source: string; source_id: string; lat: number; lng: number }>,
  apiKey = process.env.FOURSQUARE_API_KEY ?? ""
): Promise<void> {
  if (candidates.length === 0 || !apiKey) return;

  const sourceIds = candidates.map((c) => c.source_id);
  const { data, error } = await supabase
    .from("listings")
    .select("id, lat, lng, source, source_id")
    .in("source_id", sourceIds)
    .is("geo_enrichment", null);

  if (error || !data?.length) return;

  const lookup = new Map(
    candidates.map((c) => [`${c.source}:${c.source_id}`, c])
  );

  for (const row of data) {
    const key = `${row.source}:${row.source_id}`;
    const coords = lookup.get(key);
    if (!coords) continue;

    const enrichment = await fetchGeoEnrichment(coords.lat, coords.lng, 500, apiKey);

    await supabase
      .from("listings")
      .update({ geo_enrichment: enrichment })
      .eq("id", row.id);
  }
}
