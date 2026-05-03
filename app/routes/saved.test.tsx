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
import { loader } from "./saved";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeArgs() {
  return { request: new Request("http://localhost/saved"), params: {}, context: {} };
}

function makeSupabaseMock(
  savedRows: Array<{ listing_id: string }> = [],
  listings: Array<Record<string, unknown>> = []
) {
  const savedEqFn = vi.fn().mockResolvedValue({ data: savedRows, error: null });
  const savedSelectFn = vi.fn().mockReturnValue({ eq: savedEqFn });

  const listingsInFn = vi.fn().mockResolvedValue({ data: listings, error: null });
  const listingsSelectFn = vi.fn().mockReturnValue({ in: listingsInFn });

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "saved_listings") return { select: savedSelectFn };
    if (table === "listings") return { select: listingsSelectFn };
    return {};
  });

  return { supabase: { from: fromMock } };
}

const MOCK_LISTING = {
  id: "listing-1",
  source_url: "https://yad2.co.il/item/1",
  title: "Nice apartment",
  price: 6000,
  bedrooms: 2,
  area_sqm: 65,
  neighborhood: "Florentin",
  photos: ["https://example.com/photo.jpg"],
  is_stale: false,
  geo_enrichment: null,
  last_seen_at: "2026-05-01T10:00:00Z",
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

  it("returns empty savedListings when user has no saves", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const { supabase } = makeSupabaseMock([], []);
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    expect(result.savedListings).toEqual([]);
  });

  it("returns full listing data for saved listings", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const { supabase } = makeSupabaseMock(
      [{ listing_id: "listing-1" }],
      [MOCK_LISTING]
    );
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    expect(result.savedListings).toHaveLength(1);
    expect(result.savedListings[0].id).toBe("listing-1");
    expect(result.savedListings[0].price).toBe(6000);
    expect(result.savedListings[0].neighborhood).toBe("Florentin");
  });

  it("includes stale listings without removing them", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const stale = { ...MOCK_LISTING, id: "listing-2", is_stale: true };
    const { supabase } = makeSupabaseMock(
      [{ listing_id: "listing-2" }],
      [stale]
    );
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    expect(result.savedListings).toHaveLength(1);
    expect(result.savedListings[0].is_stale).toBe(true);
  });

  it("returns multiple saved listings", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const listing2 = { ...MOCK_LISTING, id: "listing-2", price: 7000 };
    const { supabase } = makeSupabaseMock(
      [{ listing_id: "listing-1" }, { listing_id: "listing-2" }],
      [MOCK_LISTING, listing2]
    );
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    expect(result.savedListings).toHaveLength(2);
  });
});
