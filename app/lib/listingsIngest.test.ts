import { describe, it, expect } from "vitest";
import { validateListingPayload } from "./listingsIngest";

const VALID: Record<string, unknown> = {
  source: "yad2",
  source_id: "abc123",
  source_url: "https://www.yad2.co.il/item/abc123",
  title: "3 bedroom in Florentin",
};

describe("validateListingPayload", () => {
  it("accepts a minimal valid payload with no errors", () => {
    expect(validateListingPayload(VALID)).toHaveLength(0);
  });

  it("accepts a fully-populated valid payload", () => {
    const full = {
      ...VALID,
      description: "Nice flat",
      price: 8000,
      bedrooms: 3,
      area_sqm: 90,
      lat: 32.07,
      lng: 34.77,
      neighborhood: "Florentin",
      photos: ["https://cdn.example.com/photo1.jpg"],
      published_at: "2026-05-01T10:00:00Z",
    };
    expect(validateListingPayload(full)).toHaveLength(0);
  });

  it("returns error for missing source", () => {
    const { source: _, ...rest } = VALID;
    const errors = validateListingPayload(rest);
    expect(errors.some((e) => e.field === "source")).toBe(true);
  });

  it("returns error for missing source_id", () => {
    const { source_id: _, ...rest } = VALID;
    const errors = validateListingPayload(rest);
    expect(errors.some((e) => e.field === "source_id")).toBe(true);
  });

  it("returns error for missing source_url", () => {
    const { source_url: _, ...rest } = VALID;
    const errors = validateListingPayload(rest);
    expect(errors.some((e) => e.field === "source_url")).toBe(true);
  });

  it("returns error for missing title", () => {
    const { title: _, ...rest } = VALID;
    const errors = validateListingPayload(rest);
    expect(errors.some((e) => e.field === "title")).toBe(true);
  });

  it("returns error for non-number price", () => {
    const errors = validateListingPayload({ ...VALID, price: "8000" });
    expect(errors.some((e) => e.field === "price")).toBe(true);
  });

  it("returns error for non-number bedrooms", () => {
    const errors = validateListingPayload({ ...VALID, bedrooms: "3" });
    expect(errors.some((e) => e.field === "bedrooms")).toBe(true);
  });

  it("returns error for non-number lat", () => {
    const errors = validateListingPayload({ ...VALID, lat: "32.07" });
    expect(errors.some((e) => e.field === "lat")).toBe(true);
  });

  it("accepts null for all optional fields", () => {
    const payload = {
      ...VALID,
      description: null,
      price: null,
      bedrooms: null,
      area_sqm: null,
      lat: null,
      lng: null,
      neighborhood: null,
      photos: null,
      published_at: null,
    };
    expect(validateListingPayload(payload)).toHaveLength(0);
  });

  it("returns a root error for non-object input", () => {
    expect(validateListingPayload(null)).toHaveLength(1);
    expect(validateListingPayload("string")).toHaveLength(1);
    expect(validateListingPayload(42)).toHaveLength(1);
  });
});
