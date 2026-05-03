import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCreate } = vi.hoisted(() => {
  const mockCreate = vi.fn();
  return { mockCreate };
});

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: { completions: { create: mockCreate } },
  })),
}));

import { hardFilter, rankWithAI } from "./matchingEngine";
import type { ListingRow, TenantProfile } from "./matchingEngine";

function makeListing(overrides: Partial<ListingRow> = {}): ListingRow {
  return {
    id: "listing-1",
    external_url: "https://yad2.co.il/item/1",
    title: "Nice apartment",
    price_ils: 6000,
    bedrooms: 2,
    sqm: 65,
    neighborhood: "Florentin",
    image_urls: [],
    is_agency: false,
    amenities: null,
    scraped_at: "2026-05-01T10:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

// ── hardFilter ───────────────────────────────────────────────────────────────

describe("hardFilter", () => {
  it("excludes listings where price exceeds budget_max", () => {
    const listings = [
      makeListing({ id: "1", price_ils: 5000 }),
      makeListing({ id: "2", price_ils: 8000 }),
      makeListing({ id: "3", price_ils: 7000 }),
    ];
    const profile: TenantProfile = { budget_max: 7000 };
    const result = hardFilter(listings, profile);
    expect(result.map((l) => l.id)).toEqual(["1", "3"]);
  });

  it("includes listings when budget_max is null", () => {
    const listings = [
      makeListing({ id: "1", price_ils: 5000 }),
      makeListing({ id: "2", price_ils: 20000 }),
    ];
    const result = hardFilter(listings, { budget_max: null });
    expect(result).toHaveLength(2);
  });

  it("includes listings when listing price is null", () => {
    const listings = [makeListing({ id: "1", price_ils: null })];
    const result = hardFilter(listings, { budget_max: 7000 });
    expect(result).toHaveLength(1);
  });

  it("excludes listings with wrong bedroom count", () => {
    const listings = [
      makeListing({ id: "1", bedrooms: 2 }),
      makeListing({ id: "2", bedrooms: 3 }),
      makeListing({ id: "3", bedrooms: 2 }),
    ];
    const result = hardFilter(listings, { bedrooms: 2 });
    expect(result.map((l) => l.id)).toEqual(["1", "3"]);
  });

  it("includes all listings when bedrooms filter is null", () => {
    const listings = [
      makeListing({ id: "1", bedrooms: 1 }),
      makeListing({ id: "2", bedrooms: 4 }),
    ];
    const result = hardFilter(listings, { bedrooms: null });
    expect(result).toHaveLength(2);
  });

  it("excludes listings outside preferred neighborhoods", () => {
    const listings = [
      makeListing({ id: "1", neighborhood: "Florentin" }),
      makeListing({ id: "2", neighborhood: "Jaffa" }),
      makeListing({ id: "3", neighborhood: "Tel Aviv - North" }),
    ];
    const result = hardFilter(listings, {
      neighborhoods: ["Florentin", "Tel Aviv - North"],
    });
    expect(result.map((l) => l.id)).toEqual(["1", "3"]);
  });

  it("includes all listings when neighborhoods array is empty", () => {
    const listings = [
      makeListing({ id: "1", neighborhood: "Florentin" }),
      makeListing({ id: "2", neighborhood: "Jaffa" }),
    ];
    const result = hardFilter(listings, { neighborhoods: [] });
    expect(result).toHaveLength(2);
  });

  it("includes listing with null neighborhood when neighborhoods filter is set", () => {
    const listings = [makeListing({ id: "1", neighborhood: null })];
    const result = hardFilter(listings, { neighborhoods: ["Florentin"] });
    expect(result).toHaveLength(1);
  });

  it("applies all three filters simultaneously", () => {
    const listings = [
      makeListing({ id: "pass", price_ils: 6000, bedrooms: 2, neighborhood: "Florentin" }),
      makeListing({ id: "fail-budget", price_ils: 9000, bedrooms: 2, neighborhood: "Florentin" }),
      makeListing({ id: "fail-beds", price_ils: 6000, bedrooms: 3, neighborhood: "Florentin" }),
      makeListing({ id: "fail-hood", price_ils: 6000, bedrooms: 2, neighborhood: "Jaffa" }),
    ];
    const result = hardFilter(listings, {
      budget_max: 7000,
      bedrooms: 2,
      neighborhoods: ["Florentin"],
    });
    expect(result.map((l) => l.id)).toEqual(["pass"]);
  });
});

// ── rankWithAI ───────────────────────────────────────────────────────────────

function mockAIResponse(rankings: Array<{ id: string; match_explanation: string }>) {
  mockCreate.mockResolvedValueOnce({
    choices: [{ message: { content: JSON.stringify({ rankings }) } }],
  });
}

describe("rankWithAI", () => {
  it("returns empty array immediately without calling OpenAI when input is empty", async () => {
    const result = await rankWithAI([], {});
    expect(mockCreate).not.toHaveBeenCalled();
    expect(result).toEqual([]);
  });

  it("returns listings in ranked order with AI explanations merged in", async () => {
    const listings = [
      makeListing({ id: "a", neighborhood: "Florentin" }),
      makeListing({ id: "b", neighborhood: "Jaffa" }),
    ];
    mockAIResponse([
      { id: "b", match_explanation: "Close to the sea, great for you." },
      { id: "a", match_explanation: "Matches your love of cafes." },
    ]);

    const result = await rankWithAI(listings, { lifestyle_signals: { near_beach: true } });
    expect(result[0].id).toBe("b");
    expect(result[0].match_explanation).toBe("Close to the sea, great for you.");
    expect(result[1].id).toBe("a");
    expect(result[1].match_explanation).toBe("Matches your love of cafes.");
  });

  it("includes match_explanation on every returned listing", async () => {
    const listings = [makeListing({ id: "x" })];
    mockAIResponse([{ id: "x", match_explanation: "Good for your quiet lifestyle." }]);

    const result = await rankWithAI(listings, {});
    expect(result[0]).toHaveProperty("match_explanation");
    expect(result[0].match_explanation.length).toBeGreaterThan(5);
  });

  it("falls back to original order with generic explanation on API error", async () => {
    const listings = [
      makeListing({ id: "1" }),
      makeListing({ id: "2" }),
    ];
    mockCreate.mockRejectedValueOnce(new Error("OpenAI unavailable"));

    const result = await rankWithAI(listings, {});
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe("1");
    expect(result[1].id).toBe("2");
    result.forEach((r) => expect(r.match_explanation).toBeTruthy());
  });

  it("falls back gracefully on malformed JSON response", async () => {
    const listings = [makeListing({ id: "1" })];
    mockCreate.mockResolvedValueOnce({
      choices: [{ message: { content: "not valid json{{" } }],
    });

    const result = await rankWithAI(listings, {});
    expect(result).toHaveLength(1);
    expect(result[0].match_explanation).toBeTruthy();
  });

  it("preserves all original listing fields on ranked output", async () => {
    const listing = makeListing({ id: "1", price_ils: 5500, image_urls: ["photo.jpg"] });
    mockAIResponse([{ id: "1", match_explanation: "Perfect fit." }]);

    const result = await rankWithAI([listing], {});
    expect(result[0].price_ils).toBe(5500);
    expect(result[0].image_urls).toEqual(["photo.jpg"]);
  });

  it("sends lifestyle signals in the user message to OpenAI", async () => {
    const listings = [makeListing({ id: "1" })];
    mockAIResponse([{ id: "1", match_explanation: "Quiet street, perfect for WFH." }]);

    const signals = { wfh: true, pets: false };
    await rankWithAI(listings, { lifestyle_signals: signals });

    const callArgs = mockCreate.mock.calls[0][0] as { messages: Array<{ role: string; content: string }> };
    const userMsg = callArgs.messages.find((m) => m.role === "user")?.content ?? "";
    expect(userMsg).toContain("wfh");
  });
});
