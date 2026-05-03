import { describe, it, expect, vi, beforeEach } from "vitest";

// ── module mocks ──────────────────────────────────────────────────────────────

vi.mock("~/lib/session", () => ({
  getSupabaseUserId: vi.fn(),
}));

vi.mock("~/lib/supabase.server", () => ({
  createSupabaseServiceServer: vi.fn(),
}));

import { getSupabaseUserId } from "~/lib/session";
import { createSupabaseServiceServer } from "~/lib/supabase.server";
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
  external_url: "https://yad2.co.il/item/1",
  title: "Nice apartment",
  price_ils: 6000,
  bedrooms: 2,
  sqm: 65,
  neighborhood: "Florentin",
  image_urls: ["https://example.com/photo.jpg"],
  is_agency: false,
  amenities: null,
  scraped_at: "2026-05-01T10:00:00Z",
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
    vi.mocked(createSupabaseServiceServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    expect(result.savedListings).toEqual([]);
  });

  it("returns full listing data for saved listings", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const { supabase } = makeSupabaseMock(
      [{ listing_id: "listing-1" }],
      [MOCK_LISTING]
    );
    vi.mocked(createSupabaseServiceServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    expect(result.savedListings).toHaveLength(1);
    expect(result.savedListings[0].id).toBe("listing-1");
    expect(result.savedListings[0].price_ils).toBe(6000);
    expect(result.savedListings[0].neighborhood).toBe("Florentin");
  });

  it("includes agency listings without removing them", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const agency = { ...MOCK_LISTING, id: "listing-2", is_agency: true };
    const { supabase } = makeSupabaseMock(
      [{ listing_id: "listing-2" }],
      [agency]
    );
    vi.mocked(createSupabaseServiceServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    expect(result.savedListings).toHaveLength(1);
    expect(result.savedListings[0].is_agency).toBe(true);
  });

  it("returns multiple saved listings", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const listing2 = { ...MOCK_LISTING, id: "listing-2", price_ils: 7000 };
    const { supabase } = makeSupabaseMock(
      [{ listing_id: "listing-1" }, { listing_id: "listing-2" }],
      [MOCK_LISTING, listing2]
    );
    vi.mocked(createSupabaseServiceServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    expect(result.savedListings).toHaveLength(2);
  });
});
