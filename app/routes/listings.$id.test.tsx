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
import { loader } from "./listings.$id";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeArgs(id = "listing-1") {
  return {
    request: new Request(`http://localhost/listings/${id}`),
    params: { id },
    context: {},
  };
}

function makeSupabaseMock(listing: Record<string, unknown> | null) {
  const singleFn = vi.fn().mockResolvedValue({ data: listing, error: null });
  const eqFn = vi.fn().mockReturnValue({ single: singleFn });
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn });
  const fromMock = vi.fn().mockReturnValue({ select: selectFn });
  return { supabase: { from: fromMock } };
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
});
