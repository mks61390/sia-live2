import { describe, it, expect } from "vitest";
import {
  getSupabaseUserId,
  setSupabaseSession,
  clearSupabaseSession,
} from "~/lib/session";

async function makeSessionRequest(
  userId: string,
  accessToken: string,
  refreshToken: string
) {
  const emptyRequest = new Request("http://localhost/");
  const setCookieHeader = await setSupabaseSession(
    emptyRequest,
    userId,
    accessToken,
    refreshToken
  );
  // Extract name=value from Set-Cookie (everything before the first ";")
  const cookieValue = setCookieHeader.split(";")[0];
  return new Request("http://localhost/", {
    headers: { Cookie: cookieValue },
  });
}

describe("getSupabaseUserId", () => {
  it("returns null for a request with no session", async () => {
    const request = new Request("http://localhost/");
    expect(await getSupabaseUserId(request)).toBeNull();
  });

  it("returns user ID after setSupabaseSession", async () => {
    const request = await makeSessionRequest("user-uuid-123", "at", "rt");
    expect(await getSupabaseUserId(request)).toBe("user-uuid-123");
  });
});

describe("clearSupabaseSession", () => {
  it("removes user ID from the session", async () => {
    const setRequest = new Request("http://localhost/");
    const setCookieHeader = await setSupabaseSession(
      setRequest,
      "user-uuid-456",
      "at",
      "rt"
    );
    const cookieValue = setCookieHeader.split(";")[0];

    const sessionRequest = new Request("http://localhost/", {
      headers: { Cookie: cookieValue },
    });

    // Confirm it's set
    expect(await getSupabaseUserId(sessionRequest)).toBe("user-uuid-456");

    // Now clear it
    const clearCookieHeader = await clearSupabaseSession(sessionRequest);
    const clearedCookieValue = clearCookieHeader.split(";")[0];
    const clearedRequest = new Request("http://localhost/", {
      headers: { Cookie: clearedCookieValue },
    });

    expect(await getSupabaseUserId(clearedRequest)).toBeNull();
  });
});
