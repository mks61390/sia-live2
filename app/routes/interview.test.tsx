import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/lib/session", () => ({
  getSupabaseUserId: vi.fn(),
}));

vi.mock("~/lib/supabase.server", () => ({
  createSupabaseServer: vi.fn(),
}));

import { getSupabaseUserId } from "~/lib/session";
import { createSupabaseServer } from "~/lib/supabase.server";
import { loader, action } from "./interview";

function makeArgs(init: { method?: string; body?: FormData; url?: string } = {}) {
  return {
    request: new Request(init.url ?? "http://localhost/interview", {
      method: init.method ?? "GET",
      body: init.body,
    }),
    params: {},
    context: {},
  };
}

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
  const fromMock = vi.fn().mockReturnValue({
    select: selectMock,
    upsert: upsertMock,
  });
  return { from: fromMock, _upsert: upsertMock };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("interview loader", () => {
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

  it("returns block 0 data for a fresh tenant with no profile", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-123");
    const supabase = makeSupabaseMock({ profile: null });
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);

    expect(result.currentBlockIndex).toBe(0);
    expect(result.visibleQuestions).toHaveLength(3);
    expect(result.completedBlocks).toBe(0);
  });

  it("skips pre-filled questions in the current block", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-123");
    const supabase = makeSupabaseMock({
      profile: {
        completed_blocks: 0,
        extracted_fields: ["budget_max"],
        lifestyle_signals: {},
      },
    });
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);

    expect(result.currentBlockIndex).toBe(0);
    expect(result.visibleQuestions).toHaveLength(2);
    expect(result.visibleQuestions.find((q) => q.field === "budget_max")).toBeUndefined();
  });

  it("auto-advances to block 1 when block 0 is fully pre-filled", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-123");
    const supabase = makeSupabaseMock({
      profile: {
        completed_blocks: 0,
        extracted_fields: ["budget_max", "bedrooms", "move_in_date"],
        lifestyle_signals: {},
      },
    });
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);

    expect(result.currentBlockIndex).toBe(1);
    expect(result.completedBlocks).toBe(1);
    // Upsert was called to persist the auto-advance
    expect(supabase._upsert).toHaveBeenCalledWith(
      expect.objectContaining({ completed_blocks: 1 })
    );
  });

  it("redirects to /browse when all blocks are complete", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-123");
    const supabase = makeSupabaseMock({
      profile: { completed_blocks: 5, extracted_fields: [], lifestyle_signals: {} },
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
    expect((thrown as Response).headers.get("Location")).toBe("/browse");
  });
});

describe("interview action", () => {
  it("redirects unauthenticated users to /login", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue(null);

    const formData = new FormData();
    formData.set("block_index", "0");

    let thrown: unknown;
    try {
      await action(makeArgs({ method: "POST", body: formData }) as Parameters<typeof action>[0]);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe("/login");
  });

  it("increments completed_blocks and redirects to /interview", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-123");
    const supabase = makeSupabaseMock({
      profile: { completed_blocks: 0, extracted_fields: [], lifestyle_signals: {} },
    });
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const formData = new FormData();
    formData.set("block_index", "0");
    formData.set("budget_max", "7000");
    formData.set("bedrooms", "2");

    let thrown: unknown;
    try {
      await action(makeArgs({ method: "POST", body: formData }) as Parameters<typeof action>[0]);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Response);
    expect((thrown as Response).status).toBe(302);
    expect((thrown as Response).headers.get("Location")).toBe("/interview");
    expect(supabase._upsert).toHaveBeenCalledWith(
      expect.objectContaining({ completed_blocks: 1, budget_max: 7000, bedrooms: 2 })
    );
  });

  it("does not overwrite fields already in extracted_fields", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-123");
    const supabase = makeSupabaseMock({
      profile: {
        completed_blocks: 0,
        extracted_fields: ["budget_max"],
        lifestyle_signals: {},
        budget_max: 5000,
      },
    });
    vi.mocked(createSupabaseServer).mockReturnValue(supabase as never);

    const formData = new FormData();
    formData.set("block_index", "0");
    formData.set("budget_max", "9999"); // attempt to overwrite
    formData.set("bedrooms", "3");

    let thrown: unknown;
    try {
      await action(makeArgs({ method: "POST", body: formData }) as Parameters<typeof action>[0]);
    } catch (e) {
      thrown = e;
    }

    expect(thrown).toBeInstanceOf(Response);
    const upsertCall = supabase._upsert.mock.calls[0][0] as Record<string, unknown>;
    // budget_max should not be in the upsert payload (or should still be 5000)
    expect(upsertCall.budget_max).toBeUndefined();
    expect(upsertCall.bedrooms).toBe(3);
  });
});
