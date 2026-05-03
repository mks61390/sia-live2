import { describe, it, expect, vi, beforeEach } from "vitest";

// ── module mocks ──────────────────────────────────────────────────────────────

vi.mock("~/lib/session", () => ({
  getSupabaseUserId: vi.fn(),
}));

vi.mock("~/lib/supabase.server", () => ({
  createSupabaseServer: vi.fn(),
}));

import { getSupabaseUserId } from "~/lib/session";
import { createSupabaseServer } from "~/lib/supabase.server";
import { loader, action } from "./listings.$id";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeArgs(id = "listing-1") {
  return {
    request: new Request(`http://localhost/listings/${id}`),
    params: { id },
    context: {},
  };
}

function makeActionArgs(id = "listing-1", body: Record<string, string> = {}) {
  const form = new URLSearchParams(body);
  return {
    request: new Request(`http://localhost/listings/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    }),
    params: { id },
    context: {},
  };
}

function makeSupabaseMock(
  listing: Record<string, unknown> | null,
  savedListings: Array<{ listing_id: string }> = []
) {
  const singleFn = vi.fn().mockResolvedValue({ data: listing, error: null });
  const listingEqFn = vi.fn().mockReturnValue({ single: singleFn });
  const listingSelectFn = vi.fn().mockReturnValue({ eq: listingEqFn });

  const savedEqFn = vi.fn().mockResolvedValue({ data: savedListings, error: null });
  const savedSelectFn = vi.fn().mockReturnValue({ eq: savedEqFn });
  const savedUpsertFn = vi.fn().mockResolvedValue({ error: null });
  const savedDeleteMatchFn = vi.fn().mockResolvedValue({ error: null });
  const savedDeleteFn = vi.fn().mockReturnValue({ match: savedDeleteMatchFn });

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "listings") return { select: listingSelectFn };
    if (table === "saved_listings") return {
      select: savedSelectFn,
      upsert: savedUpsertFn,
      delete: savedDeleteFn,
    };
    return {};
  });

  return { supabase: { from: fromMock }, savedUpsertFn, savedDeleteMatchFn };
}

const MOCK_LISTING = {
  id: "listing-1",
  source_url: "https://yad2.co.il/item/1",
  title: "Nice apartment",
  description: "Spacious 2BR in Florentin with natural light",
  price: 6000,
  bedrooms: 2,
  area_sqm: 65,
  neighborhood: "Florentin",
  photos: ["https://example.com/photo.jpg"],
  is_stale: false,
  geo_enrichment: null,
  last_seen_at: "2026-05-01T10:00:00Z",
  published_at: "2026-04-01T10:00:00Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ── loader ────────────────────────────────────────────────────────────────────

describe("loader", () => {
  it("redirects to /login when not authenticated", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue(null);

    await expect(
      loader(makeArgs() as Parameters<typeof loader>[0])
    ).rejects.toMatchObject({ status: 302 });
  });

  it("returns listing data for a valid ID", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const { supabase } = makeSupabaseMock(MOCK_LISTING);
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs("listing-1") as Parameters<typeof loader>[0]);
    expect(result.listing.id).toBe("listing-1");
    expect(result.listing.price).toBe(6000);
    expect(result.listing.neighborhood).toBe("Florentin");
  });

  it("throws 404 when listing is not found", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const { supabase } = makeSupabaseMock(null);
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    await expect(
      loader(makeArgs("missing-id") as Parameters<typeof loader>[0])
    ).rejects.toMatchObject({ status: 404 });
  });

  it("returns listing with geo_enrichment null without crashing", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const { supabase } = makeSupabaseMock({ ...MOCK_LISTING, geo_enrichment: null });
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    expect(result.listing.geo_enrichment).toBeNull();
  });

  it("returns listing with is_stale=true for stale listings", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const { supabase } = makeSupabaseMock({ ...MOCK_LISTING, is_stale: true });
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    expect(result.listing.is_stale).toBe(true);
  });

  it("returns geo_enrichment data when present", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const enrichment = {
      parks: [{ name: "HaYarkon Park", distance: 350 }],
      cafes: [{ name: "Caffe Brera", distance: 120 }],
      gyms: [],
      schools: [],
      supermarkets: [],
      pharmacies: [],
      bus_stops: [{ name: "Dizengoff St", distance: 80 }],
    };
    const { supabase } = makeSupabaseMock({ ...MOCK_LISTING, geo_enrichment: enrichment });
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    expect(result.listing.geo_enrichment).toEqual(enrichment);
  });

  it("returns isSaved=true when listing is in saved_listings", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const { supabase } = makeSupabaseMock(MOCK_LISTING, [{ listing_id: "listing-1" }]);
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs("listing-1") as Parameters<typeof loader>[0]);
    expect(result.isSaved).toBe(true);
  });

  it("returns isSaved=false when listing is not in saved_listings", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const { supabase } = makeSupabaseMock(MOCK_LISTING, []);
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs("listing-1") as Parameters<typeof loader>[0]);
    expect(result.isSaved).toBe(false);
  });
});

// ── action ────────────────────────────────────────────────────────────────────

describe("action", () => {
  it("redirects to /login when not authenticated", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue(null);

    await expect(
      action(makeActionArgs("listing-1", { intent: "save" }) as Parameters<typeof action>[0])
    ).rejects.toMatchObject({ status: 302 });
  });

  it("inserts into saved_listings when intent=save", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const { supabase, savedUpsertFn } = makeSupabaseMock(MOCK_LISTING);
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await action(
      makeActionArgs("listing-1", { intent: "save" }) as Parameters<typeof action>[0]
    );
    const json = await (result as Response).json();
    expect(json.ok).toBe(true);
    expect(savedUpsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: "user-1", listing_id: "listing-1" })
    );
  });

  it("deletes from saved_listings when intent=unsave", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const { supabase, savedDeleteMatchFn } = makeSupabaseMock(MOCK_LISTING);
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await action(
      makeActionArgs("listing-1", { intent: "unsave" }) as Parameters<typeof action>[0]
    );
    const json = await (result as Response).json();
    expect(json.ok).toBe(true);
    expect(savedDeleteMatchFn).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: "user-1", listing_id: "listing-1" })
    );
  });
});
