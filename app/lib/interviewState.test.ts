import { describe, it, expect } from "vitest";
import {
  BLOCKS,
  isFieldFilled,
  getVisibleQuestionsForBlock,
  getEffectiveCompletedBlocks,
  getCurrentBlock,
  mergeAnswers,
} from "./interviewState";

describe("isFieldFilled", () => {
  it("returns true when top-level field is in extractedFields", () => {
    expect(isFieldFilled("budget_max", ["budget_max", "bedrooms"], {})).toBe(true);
  });

  it("returns false when top-level field is not in extractedFields", () => {
    expect(isFieldFilled("budget_max", ["bedrooms"], {})).toBe(false);
  });

  it("returns true when lifestyle_signals sub-key is present", () => {
    expect(isFieldFilled("lifestyle_signals.pets", [], { pets: true })).toBe(true);
  });

  it("returns false when lifestyle_signals sub-key is absent", () => {
    expect(isFieldFilled("lifestyle_signals.pets", [], {})).toBe(false);
  });

  it("returns false when lifestyle_signals sub-key is null", () => {
    expect(isFieldFilled("lifestyle_signals.pets", [], { pets: null })).toBe(false);
  });
});

describe("getVisibleQuestionsForBlock", () => {
  const block = BLOCKS[0]; // budget, bedrooms, move_in_date

  it("returns all questions when nothing is pre-filled", () => {
    const visible = getVisibleQuestionsForBlock(block, [], {});
    expect(visible).toHaveLength(3);
  });

  it("skips a pre-filled field", () => {
    const visible = getVisibleQuestionsForBlock(block, ["budget_max"], {});
    expect(visible).toHaveLength(2);
    expect(visible.find((q) => q.field === "budget_max")).toBeUndefined();
  });

  it("returns empty array when all fields are pre-filled", () => {
    const visible = getVisibleQuestionsForBlock(
      block,
      ["budget_max", "bedrooms", "move_in_date"],
      {}
    );
    expect(visible).toHaveLength(0);
  });
});

describe("getEffectiveCompletedBlocks", () => {
  it("returns the same count when the current block has questions to show", () => {
    expect(getEffectiveCompletedBlocks(0, [], {})).toBe(0);
  });

  it("advances past a fully pre-filled block", () => {
    // Block 0 fully pre-filled → effective should be 1
    const extractedFields = ["budget_max", "bedrooms", "move_in_date"];
    expect(getEffectiveCompletedBlocks(0, extractedFields, {})).toBe(1);
  });

  it("advances past multiple fully pre-filled blocks", () => {
    // Blocks 0 and 1 fully pre-filled
    const extractedFields = ["budget_max", "bedrooms", "move_in_date", "neighborhoods"];
    const lifestyleSignals = { street_character: "Quiet", near_beach_or_park: false };
    expect(getEffectiveCompletedBlocks(0, extractedFields, lifestyleSignals)).toBe(2);
  });

  it("returns BLOCKS.length when all blocks are pre-filled", () => {
    const extractedFields = ["budget_max", "bedrooms", "move_in_date", "neighborhoods"];
    const lifestyleSignals = {
      street_character: "Quiet",
      near_beach_or_park: false,
      near_transport: "Very important",
      near_school: false,
      near_religious: false,
      pets: false,
      parking: true,
      wfh: false,
      hebrew_landlord_ok: true,
      furnished: "Either",
      min_lease_months: 12,
    };
    expect(getEffectiveCompletedBlocks(0, extractedFields, lifestyleSignals)).toBe(5);
  });
});

describe("getCurrentBlock", () => {
  it("returns block 0 when completedBlocks is 0 and nothing pre-filled", () => {
    const block = getCurrentBlock(0, [], {});
    expect(block?.index).toBe(0);
  });

  it("returns null when all blocks are complete", () => {
    expect(getCurrentBlock(5, [], {})).toBeNull();
  });

  it("skips to the next non-pre-filled block", () => {
    const extractedFields = ["budget_max", "bedrooms", "move_in_date"];
    const block = getCurrentBlock(0, extractedFields, {});
    expect(block?.index).toBe(1);
  });
});

describe("mergeAnswers", () => {
  it("parses budget_max as an integer", () => {
    const block = BLOCKS[0];
    const result = mergeAnswers({}, { budget_max: "7000" }, block);
    expect(result.budget_max).toBe(7000);
  });

  it("skips fields already in extracted_fields", () => {
    const block = BLOCKS[0];
    const profile = { extracted_fields: ["budget_max"] };
    const result = mergeAnswers(profile, { budget_max: "9000", bedrooms: "2" }, block);
    expect(result.budget_max).toBeUndefined();
    expect(result.bedrooms).toBe(2);
  });

  it("merges lifestyle_signals without overwriting existing keys", () => {
    const block = BLOCKS[3]; // pets, parking, wfh
    const profile = {
      lifestyle_signals: { pets: true }, // already set
      extracted_fields: [],
    };
    const result = mergeAnswers(profile, { pets: "no", parking: "yes", wfh: "no" }, block);
    // pets should NOT be overwritten — it's already in lifestyle_signals
    expect((result.lifestyle_signals as Record<string, unknown>)?.pets).toBe(true);
    expect((result.lifestyle_signals as Record<string, unknown>)?.parking).toBe(true);
    expect((result.lifestyle_signals as Record<string, unknown>)?.wfh).toBe(false);
  });

  it("splits neighborhoods by comma", () => {
    const block = BLOCKS[1];
    const result = mergeAnswers({}, { neighborhoods: "Florentin, Tel Aviv - North" }, block);
    expect(result.neighborhoods).toEqual(["Florentin", "Tel Aviv - North"]);
  });

  it("maps yesno answer to boolean", () => {
    const block = BLOCKS[3]; // pets, parking, wfh
    const result = mergeAnswers({}, { pets: "yes", parking: "no", wfh: "yes" }, block);
    expect((result.lifestyle_signals as Record<string, unknown>)?.pets).toBe(true);
    expect((result.lifestyle_signals as Record<string, unknown>)?.parking).toBe(false);
  });

  it("ignores empty answer strings", () => {
    const block = BLOCKS[0];
    const result = mergeAnswers({}, { budget_max: "", bedrooms: "2" }, block);
    expect(result.budget_max).toBeUndefined();
    expect(result.bedrooms).toBe(2);
  });
});
