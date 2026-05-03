import { describe, it, expect, vi, beforeEach } from "vitest";

// ── module mocks ──────────────────────────────────────────────────────────────

vi.mock("~/lib/session", () => ({
  getSupabaseUserId: vi.fn(),
}));

vi.mock("~/lib/supabase.server", () => ({
  createSupabaseServer: vi.fn(),
}));

const { mockHardFilter, mockRankWithAI } = vi.hoisted(() => ({
  mockHardFilter: vi.fn(),
  mockRankWithAI: vi.fn(),
}));

vi.mock("~/lib/matchingEngine", () => ({
  hardFilter: mockHardFilter,
  rankWithAI: mockRankWithAI,
}));

import { getSupabaseUserId } from "~/lib/session";
import { createSupabaseServer } from "~/lib/supabase.server";
import { loader, action } from "./browse";

// ── helpers ───────────────────────────────────────────────────────────────────

function makeRequest(options: { method?: string; body?: Record<string, string> } = {}) {
  const method = options.method ?? "GET";
  if (method === "POST" && options.body) {
    const form = new URLSearchParams(options.body);
    return new Request("http://localhost/browse", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
    });
  }
  return new Request("http://localhost/browse", { method });
}

function makeArgs(options: { method?: string; body?: Record<string, string> } = {}) {
  return { request: makeRequest(options), params: {}, context: {} };
}

function makeProfileMock(profile: Record<string, unknown> | null) {
  const selectEq = vi.fn().mockResolvedValue({ data: profile ? [profile] : [], error: null });
  const selectFn = vi.fn().mockReturnValue({ eq: selectEq });
  const upsertFn = vi.fn().mockResolvedValue({ error: null });
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "tenant_profiles") return { select: selectFn, upsert: upsertFn };
    if (table === "listings") return { select: { eq: vi.fn().mockResolvedValue({ data: [], error: null }) } };
    return {};
  });
  return { supabase: { from: fromMock }, upsertFn };
}

function makeSupabaseMock(
  profile: Record<string, unknown> | null,
  listings: unknown[] = []
) {
  const profileSelectEq = vi.fn().mockResolvedValue({ data: profile ? [profile] : [], error: null });
  const profileSelectFn = vi.fn().mockReturnValue({ eq: profileSelectEq });
  const listingsSelectFn = vi.fn().mockResolvedValue({ data: listings, error: null });
  const upsertFn = vi.fn().mockResolvedValue({ error: null });

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "tenant_profiles") return { select: profileSelectFn, upsert: upsertFn };
    if (table === "listings") return { select: listingsSelectFn };
    return {};
  });

  return { supabase: { from: fromMock }, upsertFn };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockHardFilter.mockImplementation((listings: unknown[]) => listings);
  mockRankWithAI.mockImplementation(async (listings: unknown[]) =>
    listings.map((l: unknown) => ({ ...(l as object), match_explanation: "Great match." }))
  );
});

// ── loader ────────────────────────────────────────────────────────────────────

describe("loader", () => {
  it("redirects to /login when not authenticated", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue(null);

    await expect(loader(makeArgs() as Parameters<typeof loader>[0])).rejects.toMatchObject({
      status: 302,
      headers: expect.any(Object),
    });
  });

  it("redirects to /interview when completed_blocks is 0", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const { supabase } = makeSupabaseMock({ tenant_id: "user-1", completed_blocks: 0 });
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    await expect(loader(makeArgs() as Parameters<typeof loader>[0])).rejects.toMatchObject({
      status: 302,
    });
  });

  it("redirects to /interview when no profile exists", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const { supabase } = makeSupabaseMock(null);
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    await expect(loader(makeArgs() as Parameters<typeof loader>[0])).rejects.toMatchObject({
      status: 302,
    });
  });

  it("returns rankedListings when completed_blocks >= 1", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const profile = {
      tenant_id: "user-1",
      completed_blocks: 1,
      budget_max: 7000,
      bedrooms: 2,
      neighborhoods: ["Florentin"],
      lifestyle_signals: { wfh: true },
      alert_enabled: false,
    };
    const listings = [
      {
        id: "l1",
        source_url: "https://yad2.co.il/1",
        title: "Nice apt",
        price: 6000,
        bedrooms: 2,
        area_sqm: 60,
        neighborhood: "Florentin",
        photos: [],
        is_stale: false,
        geo_enrichment: null,
        last_seen_at: "2026-05-01T00:00:00Z",
      },
    ];
    const { supabase } = makeSupabaseMock(profile, listings);
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    expect(result.rankedListings).toHaveLength(1);
    expect(result.rankedListings[0].match_explanation).toBe("Great match.");
  });

  it("returns empty rankedListings when no listings match the hard filter", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const profile = { tenant_id: "user-1", completed_blocks: 2, budget_max: 5000 };
    const listings = [{ id: "l1", price: 9000 }];
    const { supabase } = makeSupabaseMock(profile, listings);
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);
    mockHardFilter.mockReturnValue([]);
    mockRankWithAI.mockResolvedValue([]);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    expect(result.rankedListings).toEqual([]);
  });

  it("returns alertEnabled from tenant profile", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const profile = { tenant_id: "user-1", completed_blocks: 1, alert_enabled: true };
    const { supabase } = makeSupabaseMock(profile, []);
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    expect(result.alertEnabled).toBe(true);
  });
});

// ── action ────────────────────────────────────────────────────────────────────

describe("action", () => {
  it("redirects to /login when not authenticated", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue(null);

    await expect(
      action(makeArgs({ method: "POST", body: { intent: "enable_alert" } }) as Parameters<typeof action>[0])
    ).rejects.toMatchObject({ status: 302 });
  });

  it("saves alert_enabled=true and returns ok", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const { supabase, upsertFn } = makeProfileMock({ tenant_id: "user-1", completed_blocks: 1 });
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await action(
      makeArgs({ method: "POST", body: { intent: "enable_alert" } }) as Parameters<typeof action>[0]
    );
    const json = await (result as Response).json();
    expect(json.ok).toBe(true);
    expect(upsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: "user-1", alert_enabled: true })
    );
  });
});
