export type ListingPayload = {
  source: string;
  source_id: string;
  source_url: string;
  title: string;
  description?: string | null;
  price?: number | null;
  bedrooms?: number | null;
  area_sqm?: number | null;
  lat?: number | null;
  lng?: number | null;
  neighborhood?: string | null;
  photos?: string[] | null;
  published_at?: string | null;
};

export type ValidationError = {
  field: string;
  message: string;
};

export function validateListingPayload(payload: unknown): ValidationError[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return [{ field: "root", message: "Payload must be a non-null object" }];
  }

  const p = payload as Record<string, unknown>;
  const errors: ValidationError[] = [];

  if (!p.source || typeof p.source !== "string") {
    errors.push({ field: "source", message: "source is required and must be a string" });
  }
  if (!p.source_id || typeof p.source_id !== "string") {
    errors.push({ field: "source_id", message: "source_id is required and must be a string" });
  }
  if (!p.source_url || typeof p.source_url !== "string") {
    errors.push({ field: "source_url", message: "source_url is required and must be a string" });
  }
  if (!p.title || typeof p.title !== "string") {
    errors.push({ field: "title", message: "title is required and must be a string" });
  }

  for (const field of ["price", "bedrooms", "area_sqm", "lat", "lng"] as const) {
    const val = p[field];
    if (val !== undefined && val !== null && typeof val !== "number") {
      errors.push({ field, message: `${field} must be a number` });
    }
  }

  return errors;
}
