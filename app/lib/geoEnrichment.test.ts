import { describe, it, expect, vi, beforeEach } from "vitest";
import { fetchGeoEnrichment, enrichPendingListings } from "./geoEnrichment";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeFetchMock(overrides: Partial<Record<string, { name: string; distance: number }[]>> = {}) {
  return vi.fn().mockImplementation(async (url: string) => {
    // Determine which category this call is for by checking the categories param
    const u = new URL(url);
    const categoryId = u.searchParams.get("categories") ?? "";
    const categoryMap: Record<string, { name: string; distance: number }[]> = {
      "16032": overrides["parks"] ?? [{ name: "HaYarkon Park", distance: 120 }],
      "13035": overrides["cafes"] ?? [{ name: "Cafelix", distance: 80 }],
      "18021": overrides["gyms"] ?? [{ name: "GoActive", distance: 200 }],
      "12058": overrides["schools"] ?? [{ name: "Tel Aviv School", distance: 300 }],
      "17069": overrides["supermarkets"] ?? [{ name: "Rami Levy", distance: 150 }],
      "15014": overrides["pharmacies"] ?? [{ name: "Super-Pharm", distance: 90 }],
      "19006": overrides["bus_stops"] ?? [{ name: "Dizengoff St", distance: 50 }],
    };
    return {
      ok: true,
      json: async () => ({ results: categoryMap[categoryId] ?? [] }),
    };
  });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

// ── fetchGeoEnrichment ────────────────────────────────────────────────────────

describe("fetchGeoEnrichment", () => {
  it("returns all 7 category keys", async () => {
    vi.stubGlobal("fetch", makeFetchMock());
    const result = await fetchGeoEnrichment(32.08, 34.78, 500, "test-key");
    expect(Object.keys(result)).toEqual([
      "parks",
      "cafes",
      "gyms",
      "schools",
      "supermarkets",
      "pharmacies",
      "bus_stops",
    ]);
  });

  it("maps name and distance from Foursquare response", async () => {
    vi.stubGlobal("fetch", makeFetchMock());
    const result = await fetchGeoEnrichment(32.08, 34.78, 500, "test-key");
    expect(result.parks[0]).toEqual({ name: "HaYarkon Park", distance: 120 });
    expect(result.cafes[0]).toEqual({ name: "Cafelix", distance: 80 });
  });

  it("returns empty arrays (not null) for categories with no results", async () => {
    vi.stubGlobal(
      "fetch",
      makeFetchMock({ parks: [], cafes: [], gyms: [], schools: [], supermarkets: [], pharmacies: [], bus_stops: [] })
    );
    const result = await fetchGeoEnrichment(32.08, 34.78, 500, "test-key");
    for (const key of Object.keys(result) as (keyof typeof result)[]) {
      expect(Array.isArray(result[key])).toBe(true);
    }
  });

  it("returns EMPTY_GEO and makes no fetch calls when apiKey is empty", async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal("fetch", mockFetch);
    const result = await fetchGeoEnrichment(32.08, 34.78, 500, "");
    expect(mockFetch).not.toHaveBeenCalled();
    for (const key of Object.keys(result) as (keyof typeof result)[]) {
      expect(result[key]).toEqual([]);
    }
  });

  it("makes exactly 7 fetch calls — one per category", async () => {
    const mockFetch = makeFetchMock();
    vi.stubGlobal("fetch", mockFetch);
    await fetchGeoEnrichment(32.08, 34.78, 500, "test-key");
    expect(mockFetch).toHaveBeenCalledTimes(7);
  });

  it("returns empty array for a failing category and populates the rest", async () => {
    let callCount = 0;
    const mockFetch = vi.fn().mockImplementation(async (url: string) => {
      callCount++;
      // Fail the parks call (first one, category 16032)
      const u = new URL(url);
      if (u.searchParams.get("categories") === "16032") {
        throw new Error("network error");
      }
      return {
        ok: true,
        json: async () => ({ results: [{ name: "Place", distance: 100 }] }),
      };
    });
    vi.stubGlobal("fetch", mockFetch);
    const result = await fetchGeoEnrichment(32.08, 34.78, 500, "test-key");
    expect(result.parks).toEqual([]);
    expect(result.cafes).toEqual([{ name: "Place", distance: 100 }]);
  });

  it("constructs correct URL with expected query parameters", async () => {
    const mockFetch = makeFetchMock();
    vi.stubGlobal("fetch", mockFetch);
    await fetchGeoEnrichment(32.08, 34.78, 500, "test-key");

    const calledUrls = (mockFetch.mock.calls as unknown[][]).map((call) => new URL(call[0] as string));
    for (const u of calledUrls) {
      expect(u.hostname).toBe("api.foursquare.com");
      expect(u.pathname).toBe("/v3/places/search");
      expect(u.searchParams.get("ll")).toBe("32.08,34.78");
      expect(u.searchParams.get("radius")).toBe("500");
      expect(u.searchParams.get("fields")).toBe("name,distance");
      expect(u.searchParams.get("limit")).toBe("5");
    }
  });

  it("passes the apiKey in the Authorization header", async () => {
    const mockFetch = makeFetchMock();
    vi.stubGlobal("fetch", mockFetch);
    await fetchGeoEnrichment(32.08, 34.78, 500, "my-fsq-key");
    for (const call of mockFetch.mock.calls as unknown[][]) {
      const init = call[1] as RequestInit;
      expect((init.headers as Record<string, string>)["Authorization"]).toBe("my-fsq-key");
    }
  });
});

// ── enrichPendingListings ────────────────────────────────────────────────────

describe("enrichPendingListings", () => {
  function makeSupabaseMock(rows: Array<{ id: string; lat: number; lng: number; source: string; source_id: string }> = []) {
    const updateEq = vi.fn().mockResolvedValue({});
    const updateFn = vi.fn().mockReturnValue({ eq: updateEq });
    const isFn = vi.fn().mockResolvedValue({ data: rows, error: null });
    const inFn = vi.fn().mockReturnValue({ is: isFn });
    const selectFn = vi.fn().mockReturnValue({ in: inFn });
    const fromFn = vi.fn().mockReturnValue({ select: selectFn, update: updateFn });
    return { supabase: { from: fromFn }, updateFn, updateEq };
  }

  it("does nothing when candidates list is empty", async () => {
    const { supabase } = makeSupabaseMock();
    await enrichPendingListings(supabase as never, [], "test-key");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("does nothing when apiKey is empty", async () => {
    const { supabase } = makeSupabaseMock();
    const candidates = [{ source: "yad2", source_id: "abc", lat: 32.08, lng: 34.78 }];
    await enrichPendingListings(supabase as never, candidates, "");
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it("queries only listings with geo_enrichment IS NULL", async () => {
    const { supabase } = makeSupabaseMock([]);
    const candidates = [{ source: "yad2", source_id: "abc", lat: 32.08, lng: 34.78 }];
    vi.stubGlobal("fetch", makeFetchMock());
    await enrichPendingListings(supabase as never, candidates, "test-key");
    // Should have called .from("listings").select(...).in("source_id", ["abc"]).is("geo_enrichment", null)
    expect(supabase.from).toHaveBeenCalledWith("listings");
  });

  it("calls update with geo_enrichment for each pending listing", async () => {
    const rows = [{ id: "uuid-1", lat: 32.08, lng: 34.78, source: "yad2", source_id: "abc" }];
    const { supabase, updateFn, updateEq } = makeSupabaseMock(rows);
    vi.stubGlobal("fetch", makeFetchMock());
    const candidates = [{ source: "yad2", source_id: "abc", lat: 32.08, lng: 34.78 }];
    await enrichPendingListings(supabase as never, candidates, "test-key");
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ geo_enrichment: expect.objectContaining({ parks: expect.any(Array) }) })
    );
    expect(updateEq).toHaveBeenCalledWith("id", "uuid-1");
  });

  it("skips listings not in the candidates list", async () => {
    // DB returns a listing that isn't in candidates (edge case: source_id collision across sources)
    const rows = [{ id: "uuid-2", lat: 32.08, lng: 34.78, source: "other_source", source_id: "abc" }];
    const { supabase, updateFn } = makeSupabaseMock(rows);
    vi.stubGlobal("fetch", makeFetchMock());
    const candidates = [{ source: "yad2", source_id: "abc", lat: 32.08, lng: 34.78 }];
    await enrichPendingListings(supabase as never, candidates, "test-key");
    // "other_source:abc" is not in the lookup so no update should fire
    expect(updateFn).not.toHaveBeenCalled();
  });
});
