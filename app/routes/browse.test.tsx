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

function makeSupabaseMock(
  profile: Record<string, unknown> | null,
  listings: unknown[] = [],
  savedIds: Array<{ listing_id: string }> = []
) {
  const profileSelectEq = vi.fn().mockResolvedValue({ data: profile ? [profile] : [], error: null });
  const profileSelectFn = vi.fn().mockReturnValue({ eq: profileSelectEq });
  const listingsSelectFn = vi.fn().mockResolvedValue({ data: listings, error: null });
  const savedEqFn = vi.fn().mockResolvedValue({ data: savedIds, error: null });
  const savedSelectFn = vi.fn().mockReturnValue({ eq: savedEqFn });
  const upsertFn = vi.fn().mockResolvedValue({ error: null });

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "tenant_profiles") return { select: profileSelectFn, upsert: upsertFn };
    if (table === "listings") return { select: listingsSelectFn };
    if (table === "saved_listings") return { select: savedSelectFn };
    return {};
  });

  return { supabase: { from: fromMock }, upsertFn };
}

function makeSavedActionMock() {
  const savedUpsertFn = vi.fn().mockResolvedValue({ error: null });
  const savedDeleteMatchFn = vi.fn().mockResolvedValue({ error: null });
  const savedDeleteFn = vi.fn().mockReturnValue({ match: savedDeleteMatchFn });
  const profileUpsertFn = vi.fn().mockResolvedValue({ error: null });

  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "tenant_profiles") return { upsert: profileUpsertFn };
    if (table === "saved_listings") return { upsert: savedUpsertFn, delete: savedDeleteFn };
    return {};
  });

  return { supabase: { from: fromMock }, savedUpsertFn, savedDeleteMatchFn };
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

  it("returns savedIds from saved_listings", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const profile = { tenant_id: "user-1", completed_blocks: 1, alert_enabled: false };
    const savedIds = [{ listing_id: "l1" }, { listing_id: "l2" }];
    const { supabase } = makeSupabaseMock(profile, [], savedIds);
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    expect(result.savedIds).toEqual(["l1", "l2"]);
  });

  it("returns empty savedIds when user has no saves", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const profile = { tenant_id: "user-1", completed_blocks: 1, alert_enabled: false };
    const { supabase } = makeSupabaseMock(profile, [], []);
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    expect(result.savedIds).toEqual([]);
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
    const { supabase } = makeSavedActionMock();
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await action(
      makeArgs({ method: "POST", body: { intent: "enable_alert" } }) as Parameters<typeof action>[0]
    );
    const json = await (result as Response).json();
    expect(json.ok).toBe(true);
  });

  it("saves listing and returns ok when intent=save", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const { supabase, savedUpsertFn } = makeSavedActionMock();
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await action(
      makeArgs({ method: "POST", body: { intent: "save", listing_id: "l1" } }) as Parameters<typeof action>[0]
    );
    const json = await (result as Response).json();
    expect(json.ok).toBe(true);
    expect(savedUpsertFn).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: "user-1", listing_id: "l1" })
    );
  });

  it("removes listing from saved_listings when intent=unsave", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const { supabase, savedDeleteMatchFn } = makeSavedActionMock();
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await action(
      makeArgs({ method: "POST", body: { intent: "unsave", listing_id: "l1" } }) as Parameters<typeof action>[0]
    );
    const json = await (result as Response).json();
    expect(json.ok).toBe(true);
    expect(savedDeleteMatchFn).toHaveBeenCalledWith(
      expect.objectContaining({ tenant_id: "user-1", listing_id: "l1" })
    );
  });
});
