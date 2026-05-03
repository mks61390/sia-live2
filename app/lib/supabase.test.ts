import { describe, it, expect } from "vitest";
import { supabase } from "./supabase";

describe("supabase client", () => {
  it("exports a supabase client object", () => {
    expect(supabase).toBeDefined();
    expect(typeof supabase).toBe("object");
  });

  it("has a .from() query method", () => {
    expect(typeof supabase.from).toBe("function");
  });

  it("has an .auth property", () => {
    expect(supabase.auth).toBeDefined();
  });
});
