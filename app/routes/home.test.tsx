import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("~/lib/session", () => ({
  getCurrentUserId: vi.fn(),
}));

import { getCurrentUserId } from "~/lib/session";
import { loader } from "./home";

const makeLoaderArgs = () =>
  ({ request: new Request("http://localhost/"), params: {}, context: {} }) as Parameters<typeof loader>[0];

describe("home loader", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects authenticated users to /browse", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(1);
    let thrown: unknown;
    try {
      await loader(makeLoaderArgs());
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(Response);
    const res = thrown as Response;
    expect(res.status).toBe(302);
    expect(res.headers.get("Location")).toBe("/browse");
  });

  it("returns empty object for unauthenticated users", async () => {
    vi.mocked(getCurrentUserId).mockResolvedValue(null);
    const result = await loader(makeLoaderArgs());
    expect(result).toEqual({});
  });
});
