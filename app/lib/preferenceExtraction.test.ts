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

import { extractPreferences } from "./preferenceExtraction";

function mockOpenAIResponse(payload: object) {
  mockCreate.mockResolvedValueOnce({
    choices: [{ message: { content: JSON.stringify(payload) } }],
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("extractPreferences", () => {
  it("extracts budget_max from text", async () => {
    mockOpenAIResponse({
      budget_max: 7000,
      bedrooms: null,
      move_in_date: null,
      neighborhoods: [],
      lifestyle_signals: {},
      extracted_fields: ["budget_max"],
      confirmation_message: "You're looking for an apartment under ₪7,000.",
    });

    const result = await extractPreferences("I need something under 7000 NIS");
    expect(result.budget_max).toBe(7000);
    expect(result.extracted_fields).toContain("budget_max");
  });

  it("extracts bedrooms from text", async () => {
    mockOpenAIResponse({
      budget_max: null,
      bedrooms: 2,
      move_in_date: null,
      neighborhoods: [],
      lifestyle_signals: {},
      extracted_fields: ["bedrooms"],
      confirmation_message: "You're looking for a 2-bedroom apartment.",
    });

    const result = await extractPreferences("I want a 2-bedroom apartment");
    expect(result.bedrooms).toBe(2);
    expect(result.extracted_fields).toContain("bedrooms");
  });

  it("populates extracted_fields with all found field names", async () => {
    mockOpenAIResponse({
      budget_max: 8000,
      bedrooms: 3,
      move_in_date: "2026-08-01",
      neighborhoods: ["Tel Aviv - North"],
      lifestyle_signals: { pets: true },
      extracted_fields: [
        "budget_max",
        "bedrooms",
        "move_in_date",
        "neighborhoods",
        "lifestyle_signals",
      ],
      confirmation_message:
        "You're looking for a 3-bedroom under ₪8,000 in north Tel Aviv, moving in August — and you have a pet.",
    });

    const result = await extractPreferences(
      "3 bed in north Tel Aviv under 8000, moving August, have a dog"
    );
    expect(result.extracted_fields).toEqual([
      "budget_max",
      "bedrooms",
      "move_in_date",
      "neighborhoods",
      "lifestyle_signals.pets",
    ]);
  });

  it("returns a non-empty confirmation_message", async () => {
    mockOpenAIResponse({
      budget_max: 6500,
      bedrooms: 1,
      move_in_date: null,
      neighborhoods: ["Florentin"],
      lifestyle_signals: {},
      extracted_fields: ["budget_max", "bedrooms", "neighborhoods"],
      confirmation_message:
        "You're looking for a 1-bedroom in Florentin under ₪6,500.",
    });

    const result = await extractPreferences("1 bed in Florentin, 6500");
    expect(result.confirmation_message).toBeTruthy();
    expect(result.confirmation_message.length).toBeGreaterThan(10);
  });

  it("handles empty input gracefully without calling OpenAI", async () => {
    const result = await extractPreferences("");
    expect(mockCreate).not.toHaveBeenCalled();
    expect(result.budget_max).toBeNull();
    expect(result.bedrooms).toBeNull();
    expect(result.move_in_date).toBeNull();
    expect(result.neighborhoods).toEqual([]);
    expect(result.lifestyle_signals).toEqual({});
    expect(result.extracted_fields).toEqual([]);
    expect(result.confirmation_message).toBeTruthy();
  });

  it("returns empty extracted_fields when nothing could be extracted", async () => {
    mockOpenAIResponse({
      budget_max: null,
      bedrooms: null,
      move_in_date: null,
      neighborhoods: [],
      lifestyle_signals: {},
      extracted_fields: [],
      confirmation_message:
        "Got it — let me ask a few questions to find your ideal apartment.",
    });

    const result = await extractPreferences("I need an apartment");
    expect(result.extracted_fields).toEqual([]);
    expect(result.confirmation_message).toBeTruthy();
  });
});
