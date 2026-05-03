import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/lib/session", () => ({
  getSupabaseUserId: vi.fn(),
}));

vi.mock("~/lib/supabase.server", () => ({
  createSupabaseServer: vi.fn(),
}));

vi.mock("~/lib/preferenceExtraction", () => ({
  extractPreferences: vi.fn(),
}));

import { getSupabaseUserId } from "~/lib/session";
import { createSupabaseServer } from "~/lib/supabase.server";
import { extractPreferences } from "~/lib/preferenceExtraction";
import { loader, action } from "./preferences";

const makeArgs = (
  init: { method?: string; body?: FormData } = {}
) => ({
  request: new Request("http://localhost/preferences", {
    method: init.method ?? "GET",
    body: init.body,
  }),
  params: {},
  context: {},
});

function makeSupabaseMock({
  profile = null,
  upsertError = null,
}: {
  profile?: object | null;
  upsertError?: { message: string } | null;
} = {}) {
  const upsertMock = vi.fn().mockResolvedValue({ error: upsertError });
  const eqMock = vi.fn().mockResolvedValue({ data: profile ? [profile] : [], error: null });
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
  const fromMock = vi.fn().mockImplementation((table: string) => {
    if (table === "tenant_profiles") {
      return {
        select: selectMock,
        upsert: upsertMock,
      };
    }
    return { select: selectMock, upsert: upsertMock };
  });
  return { from: fromMock, _upsert: upsertMock };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("preferences loader", () => {
  it("redirects unauthenticated users to /login", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue(null);

    let thrown: unknown;
    try {
      await loader(makeArgs() as Parameters<typeof loader>[0]);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe("/login");
  });

  it("returns empty object for authenticated users with no profile", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-123");
    const supabase = makeSupabaseMock({ profile: null });
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    expect(result).toEqual({});
  });

  it("redirects to /interview if completed_blocks >= 1", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-123");
    const supabase = makeSupabaseMock({
      profile: { completed_blocks: 1, extracted_fields: [] },
    });
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    let thrown: unknown;
    try {
      await loader(makeArgs() as Parameters<typeof loader>[0]);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe("/interview");
  });
});

describe("preferences action", () => {
  it("returns confirmation for valid text input", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-123");
    const supabase = makeSupabaseMock();
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);
    vi.mocked(extractPreferences).mockResolvedValue({
      budget_max: 7000,
      bedrooms: 2,
      move_in_date: null,
      neighborhoods: ["Tel Aviv - North"],
      lifestyle_signals: {},
      extracted_fields: ["budget_max", "bedrooms", "neighborhoods"],
      confirmation_message:
        "You're looking for a 2-bedroom under ₪7,000 in north Tel Aviv.",
    });

    const formData = new FormData();
    formData.set("text", "2 bed in north Tel Aviv under 7000");

    const result = await action(
      makeArgs({ method: "POST", body: formData }) as Parameters<typeof action>[0]
    );
    const json = await (result as Response).json();

    expect(json.confirmation).toBeTruthy();
    expect(json.extracted).toBeDefined();
  });

  it("returns 400 for empty text input", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-123");

    const formData = new FormData();
    formData.set("text", "   ");

    const result = await action(
      makeArgs({ method: "POST", body: formData }) as Parameters<typeof action>[0]
    );

    expect((result as Response).status).toBe(400);
    const json = await (result as Response).json();
    expect(json.error).toBeTruthy();
  });

  it("returns 401 for unauthenticated action", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue(null);

    const formData = new FormData();
    formData.set("text", "2 bedrooms in Tel Aviv");

    const result = await action(
      makeArgs({ method: "POST", body: formData }) as Parameters<typeof action>[0]
    );

    expect((result as Response).status).toBe(401);
  });
});
