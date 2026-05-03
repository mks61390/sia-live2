import { redirect } from "react-router";
import type { Route } from "./+types/auth.callback";
import {
  getOAuthCodeVerifier,
  clearOAuthCodeVerifier,
  setSupabaseSession,
} from "~/lib/session";
import { createSupabaseServer } from "~/lib/supabase.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const codeVerifier = await getOAuthCodeVerifier(request);

  if (!code || !codeVerifier) {
    throw redirect("/login?error=oauth_failed");
  }

  const supabaseUrl =
    import.meta.env.VITE_SUPABASE_URL ?? "http://localhost:54321";
  const supabaseKey =
    import.meta.env.VITE_SUPABASE_ANON_KEY ?? "placeholder-anon-key";

  const tokenResponse = await fetch(
    `${supabaseUrl}/auth/v1/token?grant_type=pkce`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: supabaseKey,
      },
      body: JSON.stringify({ auth_code: code, code_verifier: codeVerifier }),
    }
  );

  if (!tokenResponse.ok) {
    throw redirect("/login?error=oauth_failed");
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token: string;
    user: { id: string; email?: string };
  };

  const { access_token, refresh_token, user } = tokenData;
  if (!access_token || !user?.id) {
    throw redirect("/login?error=oauth_failed");
  }

  // Upsert tenants row
  const supabase = createSupabaseServer();
  await supabase.auth.setSession({ access_token, refresh_token });
  await supabase.from("tenants").upsert({
    id: user.id,
    email: user.email ?? "",
  });

  // Clear the PKCE verifier and set the auth session
  const clearCookie = await clearOAuthCodeVerifier(request);
  // clearOAuthCodeVerifier returns a Set-Cookie for the session without the verifier.
  // We need to also set the Supabase tokens — do it in two steps via a combined session write.
  // Because we can't chain two Set-Cookie operations cleanly, re-read the cookie from clearCookie.
  const tempRequest = new Request("http://localhost/", {
    headers: { Cookie: clearCookie.split(";")[0] },
  });
  const authCookie = await setSupabaseSession(
    tempRequest,
    user.id,
    access_token,
    refresh_token
  );

  throw redirect("/browse", { headers: { "Set-Cookie": authCookie } });
}

export default function AuthCallback() {
  return null;
}
