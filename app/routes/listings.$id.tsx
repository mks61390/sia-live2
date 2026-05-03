import { Link, useFetcher, useLoaderData } from "react-router";
import { redirect } from "react-router";
import type { Route } from "./+types/listings.$id";
import { getSupabaseUserId } from "~/lib/session";
import { createSupabaseServiceServer } from "~/lib/supabase.server";
import type { ListingRow } from "~/lib/matchingEngine";

export function meta() {
  return [{ title: "Listing — Olim" }];
}

export async function loader({ request, params }: Route.LoaderArgs) {
  const userId = await getSupabaseUserId(request);
  if (!userId) throw redirect("/login");

  const supabase = createSupabaseServiceServer();

  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!data) throw new Response("Not found", { status: 404 });

  const { data: savedRows } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("tenant_id", userId);

  const isSaved = (savedRows ?? []).some(
    (r: { listing_id: string }) => r.listing_id === params.id
  );

  return {
    listing: data as ListingRow & { description: string | null; published_at: string | null; scraped_at: string | null; external_url: string | null; is_agency: boolean | null },
    isSaved,
  };
}

export async function action({ request, params }: Route.ActionArgs) {
  const userId = await getSupabaseUserId(request);
  if (!userId) throw redirect("/login");

  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const supabase = createSupabaseServiceServer();

  if (intent === "save") {
    await supabase
      .from("saved_listings")
      .upsert({ tenant_id: userId, listing_id: params.id });
    return Response.json({ ok: true });
  }

  if (intent === "unsave") {
    await supabase
      .from("saved_listings")
      .delete()
      .match({ tenant_id: userId, listing_id: params.id });
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false });
}

type AmenityItem = { name: string; distance: number };
type GeoEnrichment = {
  parks?: AmenityItem[];
  cafes?: AmenityItem[];
  gyms?: AmenityItem[];
  schools?: AmenityItem[];
  supermarkets?: AmenityItem[];
  pharmacies?: AmenityItem[];
  bus_stops?: AmenityItem[];
};

const AMENITY_LABELS: Record<keyof GeoEnrichment, string> = {
  parks: "Parks",
  cafes: "Cafes",
  gyms: "Gyms",
  schools: "Schools",
  supermarkets: "Supermarkets",
  pharmacies: "Pharmacies",
  bus_stops: "Bus stops",
};

function formatDistance(m: number) {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function ListingDetail() {
  const { listing, isSaved } = useLoaderData<typeof loader>();
  const geo = listing.amenities as unknown as GeoEnrichment | null;
  const fetcher = useFetcher();

  const optimisticSaved =
    fetcher.state !== "idle"
      ? fetcher.formData?.get("intent") === "save"
      : isSaved;

  const amenityKeys = Object.keys(AMENITY_LABELS) as Array<keyof GeoEnrichment>;
  const hasAmenities = geo != null && amenityKeys.some((k) => (geo[k]?.length ?? 0) > 0);

  return (
    <div>
      <div className="mx-auto max-w-3xl space-y-6 px-4 pb-12 pt-6 sm:px-6">

        {/* Photo gallery */}
        {listing.image_urls && listing.image_urls.length > 0 ? (
          <div className="overflow-x-auto">
            <div className="flex gap-3" style={{ width: "max-content" }}>
              {listing.image_urls.map((src, i) => (
                <div key={i} className="aspect-video w-80 shrink-0 overflow-hidden rounded-xl bg-muted sm:w-96">
                  <img
                    src={src}
                    alt={`Photo ${i + 1}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-xl bg-muted text-sm text-muted-foreground">
            No photos available
          </div>
        )}

        {/* Title + price */}
        <div className="space-y-1">
          {listing.title && (
            <h1 className="text-xl font-semibold sm:text-2xl">{listing.title}</h1>
          )}
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            {listing.price_ils != null && (
              <span className="text-2xl font-bold">₪{listing.price_ils!.toLocaleString()}/mo</span>
            )}
            <span className="text-muted-foreground text-sm">
              {[
                listing.bedrooms != null ? `${listing.bedrooms} bed` : null,
                listing.sqm != null ? `${listing.sqm} m²` : null,
                listing.neighborhood ?? null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
        </div>

        {/* Description */}
        {listing.description && (
          <div className="rounded-xl border border-border bg-card p-4">
            <h2 className="mb-2 text-sm font-medium text-muted-foreground uppercase tracking-wide">Description</h2>
            <p className="text-sm leading-relaxed whitespace-pre-line">{listing.description}</p>
          </div>
        )}

        {/* Nearby amenities */}
        {hasAmenities && (
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Nearby</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {amenityKeys.map((key) => {
                const items = geo?.[key];
                if (!items || items.length === 0) return null;
                return (
                  <div key={key}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                      {AMENITY_LABELS[key]}
                    </p>
                    <ul className="space-y-0.5">
                      {items.slice(0, 3).map((item, i) => (
                        <li key={i} className="flex justify-between text-sm">
                          <span className="truncate">{item.name}</span>
                          <span className="ml-2 shrink-0 text-muted-foreground">{formatDistance(item.distance)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Metadata */}
        {(listing.scraped_at ?? listing.published_at) && (
          <p className="text-xs text-muted-foreground">
            Last seen on Yad2: {formatDate((listing.scraped_at ?? listing.published_at)!)}
          </p>
        )}

        {/* Action buttons */}
        <div className="flex flex-col gap-3 sm:flex-row">
          {listing.external_url && (
            <a
              href={listing.external_url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 rounded-lg bg-primary px-4 py-3 text-center text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              View on Yad2
            </a>
          )}
          <fetcher.Form method="post" className="flex-1">
            <button
              type="submit"
              name="intent"
              value={optimisticSaved ? "unsave" : "save"}
              className="w-full rounded-lg border border-border px-4 py-3 text-sm font-medium text-foreground hover:bg-muted"
            >
              {optimisticSaved ? "Saved ✓" : "Save listing"}
            </button>
          </fetcher.Form>
        </div>
      </div>
    </div>
  );
}
