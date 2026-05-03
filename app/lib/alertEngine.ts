import { hardFilter, type ListingRow, type TenantProfile } from "./matchingEngine";
import type { createSupabaseServiceServer } from "./supabase.server";

type SupabaseService = ReturnType<typeof createSupabaseServiceServer>;

type AlertProfile = TenantProfile & { tenant_id: string };

async function sendAlertEmail(
  tenantEmail: string,
  listing: ListingRow
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  const from = process.env.RESEND_FROM ?? "Olim <noreply@olim.app>";
  const appUrl = process.env.APP_URL ?? "https://olim.app";
  const listingUrl = `${appUrl}/listings/${listing.id}`;

  const price = listing.price_ils != null ? `₪${listing.price_ils.toLocaleString()}/mo` : "Price on request";
  const summary = [listing.title, price, listing.neighborhood].filter(Boolean).join(" · ");

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [tenantEmail],
      subject: "New matching listing on Olim",
      html: `<p>A new listing matches your preferences:</p>
<p><strong>${summary}</strong></p>
<p><a href="${listingUrl}">View listing (${listing.id})</a></p>
<p>Log in to <a href="${appUrl}/browse">browse all results</a>.</p>`,
    }),
  });
}

export async function evaluateAlerts(
  supabase: SupabaseService,
  listings: ListingRow[]
): Promise<void> {
  if (listings.length === 0) return;

  const { data: profileRows, error } = await supabase
    .from("tenant_profiles")
    .select("tenant_id, budget_max, bedrooms, neighborhoods")
    .eq("alert_enabled", true);

  if (error || !profileRows || profileRows.length === 0) return;

  const profiles = profileRows as AlertProfile[];

  // For each profile, find which listings match
  const notificationRows: Array<{ tenant_id: string; listing_id: string; channel: "in_app" }> = [];

  for (const profile of profiles) {
    const matched = hardFilter(listings, profile);
    for (const listing of matched) {
      notificationRows.push({
        tenant_id: profile.tenant_id,
        listing_id: listing.id,
        channel: "in_app",
      });
    }
  }

  if (notificationRows.length === 0) return;

  await supabase
    .from("notifications")
    .upsert(notificationRows, {
      onConflict: "tenant_id,listing_id,channel",
      ignoreDuplicates: true,
    });

  // Send emails — one per matched (tenant, listing) pair; errors are isolated
  for (const row of notificationRows) {
    const listing = listings.find((l) => l.id === row.listing_id);
    if (!listing) continue;

    try {
      const { data: userData } = await supabase.auth.admin.getUserById(row.tenant_id);
      const email = userData?.user?.email;
      if (email) {
        await sendAlertEmail(email, listing);
      }
    } catch (err) {
      console.error("[alert-engine] email dispatch failed", row.tenant_id, err);
    }
  }
}
