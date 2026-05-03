import { Link, useFetcher, useLoaderData } from "react-router";
import { redirect } from "react-router";
import type { Route } from "./+types/browse";
import { getSupabaseUserId } from "~/lib/session";
import { createSupabaseServer } from "~/lib/supabase.server";
import { hardFilter, rankWithAI, type RankedListing } from "~/lib/matchingEngine";

export function meta() {
  return [{ title: "Browse listings — Olim" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getSupabaseUserId(request);
  if (!userId) throw redirect("/login");

  const supabase = createSupabaseServer();

  const { data: profileRows } = await supabase
    .from("tenant_profiles")
    .select("*")
    .eq("tenant_id", userId);

  const profile = (profileRows as Array<Record<string, unknown>> | null)?.[0] ?? null;
  const completedBlocks = (profile?.completed_blocks as number) ?? 0;
  if (completedBlocks < 1) throw redirect("/interview");

  const { data: listingRows } = await supabase
    .from("listings")
    .select(
      "id, source_url, title, price, bedrooms, area_sqm, neighborhood, photos, is_stale, geo_enrichment, last_seen_at"
    );

  const { data: savedRows } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("tenant_id", userId);

  const allListings = (listingRows ?? []) as RankedListing[];
  const savedIds = (savedRows ?? []).map((r: { listing_id: string }) => r.listing_id);

  const tenantProfile = {
    budget_max: (profile?.budget_max as number | null) ?? null,
    bedrooms: (profile?.bedrooms as number | null) ?? null,
    neighborhoods: (profile?.neighborhoods as string[]) ?? [],
    lifestyle_signals: (profile?.lifestyle_signals as Record<string, unknown>) ?? {},
  };

  const filtered = hardFilter(allListings, tenantProfile);
  const rankedListings = await rankWithAI(filtered, tenantProfile);

  return {
    rankedListings,
    alertEnabled: (profile?.alert_enabled as boolean) ?? false,
    savedIds,
  };
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await getSupabaseUserId(request);
  if (!userId) throw redirect("/login");

  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const supabase = createSupabaseServer();

  if (intent === "save") {
    const listingId = formData.get("listing_id") as string;
    await supabase
      .from("saved_listings")
      .upsert({ tenant_id: userId, listing_id: listingId });
    return Response.json({ ok: true });
  }

  if (intent === "unsave") {
    const listingId = formData.get("listing_id") as string;
    await supabase
      .from("saved_listings")
      .delete()
      .match({ tenant_id: userId, listing_id: listingId });
    return Response.json({ ok: true });
  }

  // intent === "enable_alert"
  await supabase
    .from("tenant_profiles")
    .upsert({ tenant_id: userId, alert_enabled: true, updated_at: new Date().toISOString() });

  return Response.json({ ok: true });
}

function SaveButton({ listingId, isSaved }: { listingId: string; isSaved: boolean }) {
  const fetcher = useFetcher();
  const optimisticSaved =
    fetcher.state !== "idle"
      ? fetcher.formData?.get("intent") === "save"
      : isSaved;

  return (
    <fetcher.Form method="post" className="w-full">
      <input type="hidden" name="listing_id" value={listingId} />
      <button
        type="submit"
        name="intent"
        value={optimisticSaved ? "unsave" : "save"}
        className="w-full py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        {optimisticSaved ? "Saved ✓" : "Save"}
      </button>
    </fetcher.Form>
  );
}

function ListingCard({ listing, savedIds }: { listing: RankedListing; savedIds: Set<string> }) {
  const photo = listing.photos?.[0];
  return (
    <div className="group overflow-hidden rounded-xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <Link
        to={`/listings/${listing.id}`}
        className="block"
      >
        <div className="aspect-video w-full overflow-hidden bg-muted">
          {photo ? (
            <img
              src={photo}
              alt={listing.title ?? "Listing photo"}
              className="h-full w-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No photo
            </div>
          )}
        </div>
        <div className="p-4 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-lg font-semibold">
              {listing.price != null ? `₪${listing.price.toLocaleString()}/mo` : "Price on request"}
            </span>
            <span className="text-sm text-muted-foreground">
              {[
                listing.bedrooms != null ? `${listing.bedrooms} bed` : null,
                listing.area_sqm != null ? `${listing.area_sqm}m²` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </div>
          {listing.neighborhood && (
            <p className="text-sm text-muted-foreground">{listing.neighborhood}</p>
          )}
          <p className="text-sm leading-snug text-foreground/80">{listing.match_explanation}</p>
        </div>
      </Link>
      <div className="border-t border-border px-4 pb-1">
        <SaveButton listingId={listing.id} isSaved={savedIds.has(listing.id)} />
      </div>
    </div>
  );
}

function AlertBanner() {
  const fetcher = useFetcher();
  const isEnabling = fetcher.state !== "idle";

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-card px-4 py-3 text-sm">
      <span className="text-muted-foreground">Get notified when new matching listings appear</span>
      <fetcher.Form method="post">
        <input type="hidden" name="intent" value="enable_alert" />
        <button
          type="submit"
          disabled={isEnabling}
          className="whitespace-nowrap font-medium text-primary hover:underline disabled:opacity-50"
        >
          {isEnabling ? "Enabling…" : "Enable alerts"}
        </button>
      </fetcher.Form>
    </div>
  );
}

export default function Browse() {
  const { rankedListings, alertEnabled, savedIds } = useLoaderData<typeof loader>();
  const savedSet = new Set(savedIds);

  return (
    <div className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">

        {!alertEnabled && <AlertBanner />}

        {rankedListings.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <p className="text-lg font-medium">No listings match your current preferences</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Try broadening your budget, bedroom count, or neighborhoods.
            </p>
            <Link
              to="/interview"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              Update preferences →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {rankedListings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} savedIds={savedSet} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
