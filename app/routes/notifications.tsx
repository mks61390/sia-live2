import { Link, useFetcher, useLoaderData } from "react-router";
import { redirect } from "react-router";
import type { Route } from "./+types/notifications";
import { getSupabaseUserId } from "~/lib/session";
import { createSupabaseServiceServer } from "~/lib/supabase.server";

export function meta() {
  return [{ title: "Notifications — Olim" }];
}

type ListingSnippet = {
  id: string;
  title: string | null;
  price: number | null;
  neighborhood: string | null;
  photos: string[];
};

type NotificationWithListing = {
  id: string;
  listing_id: string;
  channel: string;
  sent_at: string;
  read_at: string | null;
  listings: ListingSnippet | ListingSnippet[] | null;
};

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getSupabaseUserId(request);
  if (!userId) throw redirect("/login");

  const supabase = createSupabaseServiceServer();

  const { data } = await supabase
    .from("notifications")
    .select("id, listing_id, channel, sent_at, read_at, listings(id, title, price, neighborhood, photos)")
    .eq("tenant_id", userId)
    .is("channel", "in_app");

  return { notifications: (data ?? []) as unknown as NotificationWithListing[] };
}

export async function action({ request }: Route.ActionArgs) {
  const userId = await getSupabaseUserId(request);
  if (!userId) throw redirect("/login");

  const formData = await request.formData();
  const intent = formData.get("intent") as string;
  const supabase = createSupabaseServiceServer();
  const now = new Date().toISOString();

  if (intent === "mark_read") {
    const notificationId = formData.get("notification_id") as string;
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("id", notificationId);
    return Response.json({ ok: true });
  }

  if (intent === "mark_all_read") {
    await supabase
      .from("notifications")
      .update({ read_at: now })
      .eq("tenant_id", userId)
      .is("read_at", null);
    return Response.json({ ok: true });
  }

  return Response.json({ ok: false });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function NotificationItem({ notification }: { notification: NotificationWithListing }) {
  const fetcher = useFetcher();
  const isRead = notification.read_at != null;
  const listing = Array.isArray(notification.listings)
    ? notification.listings[0] ?? null
    : notification.listings;

  return (
    <div className={`flex gap-4 rounded-xl border border-border bg-card p-4 ${isRead ? "opacity-60" : ""}`}>
      <div className="flex-1 min-w-0">
        <Link
          to={`/listings/${notification.listing_id}`}
          className="block hover:underline"
        >
          <p className="font-medium text-sm truncate">
            {listing?.title ?? "Listing"}
          </p>
          <p className="text-sm text-muted-foreground">
            {[
              listing?.price != null ? `₪${listing.price.toLocaleString()}/mo` : null,
              listing?.neighborhood,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </Link>
        <p className="mt-1 text-xs text-muted-foreground">{formatDate(notification.sent_at)}</p>
      </div>
      {!isRead && (
        <fetcher.Form method="post" className="shrink-0 self-center">
          <input type="hidden" name="intent" value="mark_read" />
          <input type="hidden" name="notification_id" value={notification.id} />
          <button
            type="submit"
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Mark read
          </button>
        </fetcher.Form>
      )}
    </div>
  );
}

export default function Notifications() {
  const { notifications } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const unreadCount = notifications.filter((n) => n.read_at == null).length;

  return (
    <div className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">

        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">
            Notifications
            {unreadCount > 0 && (
              <span className="ml-2 inline-flex items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                {unreadCount}
              </span>
            )}
          </h1>
          {unreadCount > 0 && (
            <fetcher.Form method="post">
              <input type="hidden" name="intent" value="mark_all_read" />
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                Mark all read
              </button>
            </fetcher.Form>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <p className="text-lg font-medium">No notifications yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Enable alerts on the browse page to get notified when new matching listings appear.
            </p>
            <Link
              to="/browse"
              className="mt-4 inline-block text-sm font-medium text-primary hover:underline"
            >
              Browse listings →
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((n) => (
              <NotificationItem key={n.id} notification={n} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
