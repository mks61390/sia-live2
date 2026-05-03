import { createSupabaseServiceServer } from "~/lib/supabase.server";
import { validateListingPayload, type ListingPayload } from "~/lib/listingsIngest";

export async function action({ request }: { request: Request }) {
  // Auth
  const secret = process.env.LISTINGS_INGEST_SECRET;
  const auth = request.headers.get("Authorization");
  if (!auth || !secret || auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Parse body
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body)) {
    return Response.json({ error: "Body must be a JSON array of listings" }, { status: 400 });
  }

  // Validate every item before touching the DB
  const allErrors: Array<{ index: number; errors: ReturnType<typeof validateListingPayload> }> = [];
  for (let i = 0; i < body.length; i++) {
    const errors = validateListingPayload(body[i]);
    if (errors.length > 0) {
      allErrors.push({ index: i, errors });
    }
  }
  if (allErrors.length > 0) {
    return Response.json({ errors: allErrors }, { status: 400 });
  }

  const now = new Date().toISOString();
  const rows = (body as ListingPayload[]).map((listing) => ({
    source: listing.source,
    source_id: listing.source_id,
    source_url: listing.source_url,
    title: listing.title,
    description: listing.description ?? null,
    price: listing.price ?? null,
    bedrooms: listing.bedrooms ?? null,
    area_sqm: listing.area_sqm ?? null,
    lat: listing.lat ?? null,
    lng: listing.lng ?? null,
    neighborhood: listing.neighborhood ?? null,
    photos: listing.photos ?? [],
    published_at: listing.published_at ?? null,
    last_seen_at: now,
    is_stale: false,
  }));

  const supabase = createSupabaseServiceServer();
  const { error } = await supabase
    .from("listings")
    .upsert(rows, { onConflict: "source,source_id" });

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ upserted: rows.length }, { status: 200 });
}
