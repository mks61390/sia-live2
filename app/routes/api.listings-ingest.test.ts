import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/lib/supabase.server", () => ({
  createSupabaseServiceServer: vi.fn(),
}));

const { mockEnrichPendingListings } = vi.hoisted(() => ({
  mockEnrichPendingListings: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("~/lib/geoEnrichment", () => ({
  enrichPendingListings: mockEnrichPendingListings,
}));

import { createSupabaseServiceServer } from "~/lib/supabase.server";
import { action } from "./api.listings-ingest";

const VALID_LISTING = {
  source: "yad2",
  source_id: "abc123",
  source_url: "https://www.yad2.co.il/item/abc123",
  title: "3 bedroom in Florentin",
  price: 8000,
  bedrooms: 3,
  neighborhood: "Florentin",
};

function makeRequest(options: {
  body?: unknown;
  secret?: string | null;
}) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (options.secret !== null) {
    headers["Authorization"] = `Bearer ${options.secret ?? "correct-secret"}`;
  }
  return new Request("http://localhost/api/listings-ingest", {
    method: "POST",
    headers,
    body: JSON.stringify(options.body ?? [VALID_LISTING]),
  });
}

function makeArgs(options: { body?: unknown; secret?: string | null } = {}) {
  return { request: makeRequest(options), params: {}, context: {} };
}

function makeSupabaseMock(upsertError: { message: string } | null = null) {
  const upsertMock = vi.fn().mockResolvedValue({ error: upsertError });
  const fromMock = vi.fn().mockReturnValue({ upsert: upsertMock });
  return {
    supabase: { from: fromMock },
    upsertMock,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("LISTINGS_INGEST_SECRET", "correct-secret");
});

describe("POST /api/listings-ingest", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const res = await action(
      makeArgs({ secret: null }) as Parameters<typeof action>[0]
    );
    expect(res.status).toBe(401);
  });

  it("returns 401 when the secret is wrong", async () => {
    const res = await action(
      makeArgs({ secret: "wrong-secret" }) as Parameters<typeof action>[0]
    );
    expect(res.status).toBe(401);
  });

  it("returns 400 when body is not an array", async () => {
    const res = await action(
      makeArgs({ body: { not: "an array" } }) as Parameters<typeof action>[0]
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toMatch(/array/i);
  });

  it("returns 400 when a listing in the batch fails validation", async () => {
    const bad = { source: "yad2" }; // missing source_id, source_url, title
    const res = await action(
      makeArgs({ body: [bad] }) as Parameters<typeof action>[0]
    );
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(Array.isArray(json.errors)).toBe(true);
    expect(json.errors.length).toBeGreaterThan(0);
  });

  it("upserts valid listings and returns 200 with count", async () => {
    const { supabase, upsertMock } = makeSupabaseMock();
    vi.mocked(createSupabaseServiceServer).mockReturnValue(supabase as never);

    const res = await action(
      makeArgs({ body: [VALID_LISTING] }) as Parameters<typeof action>[0]
    );
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.upserted).toBe(1);

    expect(upsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          source: "yad2",
          source_id: "abc123",
          is_stale: false,
        }),
      ]),
      expect.objectContaining({ onConflict: "source,source_id" })
    );
  });

  it("updates last_seen_at on each upserted listing", async () => {
    const { supabase, upsertMock } = makeSupabaseMock();
    vi.mocked(createSupabaseServiceServer).mockReturnValue(supabase as never);

    const before = new Date();
    await action(makeArgs({ body: [VALID_LISTING] }) as Parameters<typeof action>[0]);
    const after = new Date();

    const [rows] = upsertMock.mock.calls[0] as [Array<Record<string, unknown>>];
    const lastSeen = new Date(rows[0].last_seen_at as string);
    expect(lastSeen.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(lastSeen.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("returns 500 when Supabase upsert fails", async () => {
    const { supabase } = makeSupabaseMock({ message: "DB error" });
    vi.mocked(createSupabaseServiceServer).mockReturnValue(supabase as never);

    const res = await action(
      makeArgs({ body: [VALID_LISTING] }) as Parameters<typeof action>[0]
    );
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error).toMatch(/DB error/i);
  });

  it("triggers enrichPendingListings for listings that have lat and lng", async () => {
    const { supabase } = makeSupabaseMock();
    vi.mocked(createSupabaseServiceServer).mockReturnValue(supabase as never);
    mockEnrichPendingListings.mockResolvedValueOnce(undefined);

    const listing = { ...VALID_LISTING, lat: 32.08, lng: 34.78 };
    const res = await action(makeArgs({ body: [listing] }) as Parameters<typeof action>[0]);
    expect(res.status).toBe(200);

    // Give the fire-and-forget a tick to start
    await new Promise((r) => setTimeout(r, 0));
    expect(mockEnrichPendingListings).toHaveBeenCalledWith(
      supabase,
      expect.arrayContaining([
        expect.objectContaining({ source: "yad2", source_id: "abc123", lat: 32.08, lng: 34.78 }),
      ])
    );
  });

  it("does not call enrichPendingListings for listings without lat/lng", async () => {
    const { supabase } = makeSupabaseMock();
    vi.mocked(createSupabaseServiceServer).mockReturnValue(supabase as never);

    // VALID_LISTING has no lat/lng
    await action(makeArgs({ body: [VALID_LISTING] }) as Parameters<typeof action>[0]);
    await new Promise((r) => setTimeout(r, 0));
    expect(mockEnrichPendingListings).not.toHaveBeenCalled();
  });

  it("returns 200 even when enrichPendingListings rejects", async () => {
    const { supabase } = makeSupabaseMock();
    vi.mocked(createSupabaseServiceServer).mockReturnValue(supabase as never);
    mockEnrichPendingListings.mockRejectedValueOnce(new Error("Foursquare down"));

    const listing = { ...VALID_LISTING, lat: 32.08, lng: 34.78 };
    const res = await action(makeArgs({ body: [listing] }) as Parameters<typeof action>[0]);
    expect(res.status).toBe(200);
  });

  it("accepts a batch of multiple listings", async () => {
    const { supabase, upsertMock } = makeSupabaseMock();
    vi.mocked(createSupabaseServiceServer).mockReturnValue(supabase as never);

    const batch = [
      VALID_LISTING,
      { ...VALID_LISTING, source_id: "def456", title: "1 bed in Tel Aviv" },
    ];
    const res = await action(makeArgs({ body: batch }) as Parameters<typeof action>[0]);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.upserted).toBe(2);

    const [rows] = upsertMock.mock.calls[0] as [Array<unknown>];
    expect(rows).toHaveLength(2);
  });
});
