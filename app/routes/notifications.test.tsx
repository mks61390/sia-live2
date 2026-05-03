import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/lib/session", () => ({
  getSupabaseUserId: vi.fn(),
}));

vi.mock("~/lib/supabase.server", () => ({
  createSupabaseServer: vi.fn(),
}));

import { getSupabaseUserId } from "~/lib/session";
import { createSupabaseServer } from "~/lib/supabase.server";
import { loader, action } from "./notifications";

function makeRequest(opts: { method?: string; body?: Record<string, string> } = {}) {
  const method = opts.method ?? "GET";
  if (opts.body) {
    const fd = new FormData();
    for (const [k, v] of Object.entries(opts.body)) fd.append(k, v);
    return new Request("http://localhost/notifications", { method, body: fd });
  }
  return new Request("http://localhost/notifications", { method });
}

function makeArgs(opts: { method?: string; body?: Record<string, string> } = {}) {
  return { request: makeRequest(opts), params: {}, context: {} };
}

const NOTIFICATION = {
  id: "notif-1",
  listing_id: "listing-1",
  channel: "in_app",
  sent_at: "2026-05-03T10:00:00Z",
  read_at: null,
  listings: { id: "listing-1", title: "3BR in Florentin", price: 8000, neighborhood: "Florentin", photos: [] },
};

function makeSupabaseMock(opts: {
  notifications?: unknown[];
  updateError?: string;
} = {}) {
  const updateMock = vi.fn().mockReturnThis();
  const eqMock = vi.fn().mockReturnThis();
  const inMock = vi.fn().mockReturnThis();
  const isNullMock = vi.fn().mockReturnThis();

  const notifSelectChain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    is: vi.fn().mockResolvedValue({ data: opts.notifications ?? [], error: null }),
  };

  const updateChain = {
    update: updateMock,
    eq: eqMock,
    is: isNullMock,
    in: inMock,
    mockResolvedValue: vi.fn(),
  };
  updateMock.mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: opts.updateError ? { message: opts.updateError } : null }) });

  let callCount = 0;
  const fromMock = vi.fn(() => {
    callCount++;
    if (callCount === 1) return notifSelectChain;
    return {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: opts.updateError ? { message: opts.updateError } : null }),
        is: vi.fn().mockResolvedValue({ error: null }),
        in: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
  });

  return {
    supabase: { from: fromMock } as unknown as ReturnType<typeof createSupabaseServer>,
    fromMock,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("notifications loader", () => {
  it("redirects to /login when unauthenticated", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue(null);
    await expect(loader(makeArgs() as Parameters<typeof loader>[0])).rejects.toMatchObject({ status: 302 });
  });

  it("returns notifications list for authenticated user", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const { supabase } = makeSupabaseMock({ notifications: [NOTIFICATION] });
    vi.mocked(createSupabaseServer).mockReturnValue(supabase);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    const data = result as { notifications: typeof NOTIFICATION[] };
    expect(data.notifications).toHaveLength(1);
    expect(data.notifications[0].id).toBe("notif-1");
  });

  it("returns empty list when user has no notifications", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");
    const { supabase } = makeSupabaseMock({ notifications: [] });
    vi.mocked(createSupabaseServer).mockReturnValue(supabase);

    const result = await loader(makeArgs() as Parameters<typeof loader>[0]);
    const data = result as { notifications: unknown[] };
    expect(data.notifications).toHaveLength(0);
  });
});

describe("notifications action", () => {
  it("redirects to /login when unauthenticated", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue(null);
    await expect(
      action(makeArgs({ method: "POST", body: { intent: "mark_all_read" } }) as Parameters<typeof action>[0])
    ).rejects.toMatchObject({ status: 302 });
  });

  it("mark_read updates read_at for the notification", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");

    const eqChain = vi.fn().mockResolvedValue({ error: null });
    const updateChain = vi.fn().mockReturnValue({ eq: eqChain });
    const fromMock = vi.fn().mockReturnValue({ update: updateChain });
    const supabase = { from: fromMock } as unknown as ReturnType<typeof createSupabaseServer>;
    vi.mocked(createSupabaseServer).mockReturnValue(supabase);

    const res = await action(
      makeArgs({ method: "POST", body: { intent: "mark_read", notification_id: "notif-1" } }) as Parameters<typeof action>[0]
    );
    expect(res.status).toBe(200);
    expect(fromMock).toHaveBeenCalledWith("notifications");
    expect(updateChain).toHaveBeenCalledWith(expect.objectContaining({ read_at: expect.any(String) }));
  });

  it("mark_all_read updates all unread notifications for the user", async () => {
    vi.mocked(getSupabaseUserId).mockResolvedValue("user-1");

    const isChain = vi.fn().mockResolvedValue({ error: null });
    const eqChain = vi.fn().mockReturnValue({ is: isChain });
    const updateChain = vi.fn().mockReturnValue({ eq: eqChain });
    const fromMock = vi.fn().mockReturnValue({ update: updateChain });
    const supabase = { from: fromMock } as unknown as ReturnType<typeof createSupabaseServer>;
    vi.mocked(createSupabaseServer).mockReturnValue(supabase);

    const res = await action(
      makeArgs({ method: "POST", body: { intent: "mark_all_read" } }) as Parameters<typeof action>[0]
    );
    expect(res.status).toBe(200);
    expect(updateChain).toHaveBeenCalledWith(expect.objectContaining({ read_at: expect.any(String) }));
    expect(eqChain).toHaveBeenCalledWith("tenant_id", "user-1");
  });
});
