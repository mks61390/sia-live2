import { Form, Link, useLoaderData } from "react-router";
import { redirect } from "react-router";
import type { Route } from "./+types/saved";
import { getSupabaseUserId } from "~/lib/session";
import { createSupabaseServer } from "~/lib/supabase.server";
import type { ListingRow } from "~/lib/matchingEngine";

export function meta() {
  return [{ title: "Saved listings — Olim" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getSupabaseUserId(request);
  if (!userId) throw redirect("/login");

  const supabase = createSupabaseServer();

  const { data: savedRows } = await supabase
    .from("saved_listings")
    .select("listing_id")
    .eq("tenant_id", userId);

  const listingIds = (savedRows ?? []).map((r: { listing_id: string }) => r.listing_id);

  if (listingIds.length === 0) {
    return { savedListings: [] as ListingRow[] };
  }

  const { data: listingRows } = await supabase
    .from("listings")
    .select("*")
    .in("id", listingIds);

  return { savedListings: (listingRows ?? []) as ListingRow[] };
}

function SavedCard({ listing }: { listing: ListingRow }) {
  const photo = listing.photos?.[0];
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {listing.is_stale && (
        <div className="border-b border-yellow-200 bg-yellow-50 px-4 py-2 text-xs text-yellow-800 dark:border-yellow-800 dark:bg-yellow-950 dark:text-yellow-200">
          This listing may no longer be available
        </div>
      )}
      <Link
        to={`/listings/${listing.id}`}
        className="group block transition-shadow hover:shadow-md"
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
        </div>
      </Link>
    </div>
  );
}

export default function Saved() {
  const { savedListings } = useLoaderData<typeof loader>();

  return (
    <div className="min-h-screen bg-background px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl space-y-6">
        <div className="flex items-center justify-between">
          <Link to="/browse" className="text-2xl font-bold tracking-tight">
            Olim
          </Link>
          <div className="flex items-center gap-4">
            <Link to="/browse" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
              ← Browse results
            </Link>
            <Form method="post" action="/api/logout">
              <button type="submit" className="text-sm text-muted-foreground hover:text-foreground hover:underline">
                Log out
              </button>
            </Form>
          </div>
        </div>

        <h1 className="text-xl font-semibold">Saved listings</h1>

        {savedListings.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <p className="text-lg font-medium">No saved listings yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Save listings from browse results or a listing page to find them here.
            </p>
            <Link
              to="/browse"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              Start searching →
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {savedListings.map((listing) => (
              <SavedCard key={listing.id} listing={listing} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
