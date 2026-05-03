import { describe, it, expect, vi, beforeEach } from "vitest";
import type { ListingRow } from "./matchingEngine";

// ── Supabase mock factory ────────────────────────────────────────────────────

function makeNotificationChain(opts: { upsertError?: string } = {}) {
  const upsertMock = vi.fn().mockResolvedValue({
    error: opts.upsertError ? { message: opts.upsertError } : null,
  });
  return { upsert: upsertMock, _upsertMock: upsertMock };
}

function makeSupabaseMock(opts: {
  profiles?: Array<Record<string, unknown>>;
  profilesError?: string;
  upsertError?: string;
  userEmail?: string;
} = {}) {
  const notifChain = makeNotificationChain({ upsertError: opts.upsertError });

  const fromMock = vi.fn((table: string) => {
    if (table === "tenant_profiles") {
      const chain = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: opts.profiles ?? [],
          error: opts.profilesError ? { message: opts.profilesError } : null,
        }),
      };
      return chain;
    }
    if (table === "notifications") {
      return notifChain;
    }
    return { select: vi.fn().mockReturnThis(), eq: vi.fn().mockResolvedValue({ data: [], error: null }) };
  });

  const getUserByIdMock = vi.fn().mockResolvedValue({
    data: { user: { email: opts.userEmail ?? "tenant@example.com" } },
    error: null,
  });

  return {
    supabase: {
      from: fromMock,
      auth: { admin: { getUserById: getUserByIdMock } },
    } as unknown as ReturnType<typeof import("./supabase.server").createSupabaseServiceServer>,
    upsertMock: notifChain._upsertMock,
    getUserByIdMock,
  };
}

const LISTING: ListingRow = {
  id: "listing-1",
  external_url: "https://yad2.co.il/item/1",
  title: "3BR in Florentin",
  price_ils: 8000,
  bedrooms: 3,
  sqm: 80,
  neighborhood: "Florentin",
  image_urls: [],
  is_agency: false,
  amenities: null,
  scraped_at: "2026-05-03T00:00:00Z",
};

const MATCHING_PROFILE = {
  tenant_id: "tenant-uuid-1",
  budget_max: 10000,
  bedrooms: 3,
  neighborhoods: ["Florentin", "Jaffa"],
};

// ── Tests ────────────────────────────────────────────────────────────────────

describe("evaluateAlerts", () => {
  let evaluateAlerts: typeof import("./alertEngine").evaluateAlerts;

  beforeEach(async () => {
    vi.resetModules();
    vi.unstubAllEnvs();
    vi.stubEnv("RESEND_API_KEY", "test-key");
    vi.stubEnv("RESEND_FROM", "Olim <noreply@olim.app>");
    // Re-import after resetModules so we get a fresh module with fresh fetch mock
    const mod = await import("./alertEngine");
    evaluateAlerts = mod.evaluateAlerts;
  });

  it("does nothing when there are no active alert profiles", async () => {
    const { supabase, upsertMock } = makeSupabaseMock({ profiles: [] });
    await evaluateAlerts(supabase, [LISTING]);
    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("upserts an in_app notification when listing matches a profile", async () => {
    const { supabase, upsertMock } = makeSupabaseMock({
      profiles: [MATCHING_PROFILE],
    });
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    await evaluateAlerts(supabase, [LISTING]);

    expect(upsertMock).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({
          tenant_id: "tenant-uuid-1",
          listing_id: "listing-1",
          channel: "in_app",
        }),
      ]),
      expect.objectContaining({ onConflict: "tenant_id,listing_id,channel", ignoreDuplicates: true })
    );
  });

  it("does not notify when the listing does not match the profile", async () => {
    const tooExpensiveProfile = { ...MATCHING_PROFILE, budget_max: 5000 };
    const { supabase, upsertMock } = makeSupabaseMock({
      profiles: [tooExpensiveProfile],
    });
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    await evaluateAlerts(supabase, [LISTING]);

    expect(upsertMock).not.toHaveBeenCalled();
  });

  it("sends an email via Resend when a listing matches", async () => {
    const { supabase } = makeSupabaseMock({ profiles: [MATCHING_PROFILE] });
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    global.fetch = fetchMock;

    await evaluateAlerts(supabase, [LISTING]);

    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.resend.com/emails",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer test-key",
        }),
      })
    );
    const body = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(body.to).toContain("tenant@example.com");
    expect(body.html).toContain("listing-1");
  });

  it("does not crash when the email fetch throws", async () => {
    const { supabase } = makeSupabaseMock({ profiles: [MATCHING_PROFILE] });
    global.fetch = vi.fn().mockRejectedValue(new Error("Network down"));

    await expect(evaluateAlerts(supabase, [LISTING])).resolves.not.toThrow();
  });

  it("skips email silently when RESEND_API_KEY is missing", async () => {
    vi.unstubAllEnvs();
    const { supabase, upsertMock } = makeSupabaseMock({ profiles: [MATCHING_PROFILE] });
    const fetchMock = vi.fn();
    global.fetch = fetchMock;

    await evaluateAlerts(supabase, [LISTING]);

    // in_app notification still created
    expect(upsertMock).toHaveBeenCalled();
    // email skipped
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("only notifies tenants whose profiles match — not all active tenants", async () => {
    const tooExpensive = { tenant_id: "tenant-2", budget_max: 1000, bedrooms: 3, neighborhoods: ["Florentin"] };
    const { supabase, upsertMock } = makeSupabaseMock({
      profiles: [MATCHING_PROFILE, tooExpensive],
    });
    global.fetch = vi.fn().mockResolvedValue({ ok: true });

    await evaluateAlerts(supabase, [LISTING]);

    // Only one notification row for the matching tenant
    const [rows] = upsertMock.mock.calls[0] as [Array<Record<string, unknown>>];
    expect(rows).toHaveLength(1);
    expect(rows[0].tenant_id).toBe("tenant-uuid-1");
  });
});
