import crypto from "node:crypto";
import { Form, Link, useActionData, useNavigation } from "react-router";
import { redirect, data } from "react-router";
import { z } from "zod";
import type { Route } from "./+types/login";
import {
  getSupabaseUserId,
  setSupabaseSession,
  setOAuthCodeVerifier,
} from "~/lib/session";
import { createSupabaseServer } from "~/lib/supabase.server";
import { parseFormData } from "~/lib/validation";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Card, CardContent } from "~/components/ui/card";

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .min(1, "Email is required.")
    .email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

export function meta() {
  return [
    { title: "Log In — Olim" },
    { name: "description", content: "Log in to your Olim account" },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getSupabaseUserId(request);
  if (userId) throw redirect("/browse");
  return {};
}

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const intent = formData.get("intent");

  if (intent === "google") {
    const supabaseUrl =
      import.meta.env.VITE_SUPABASE_URL ?? "http://localhost:54321";
    const origin = new URL(request.url).origin;

    const codeVerifier = crypto.randomBytes(32).toString("base64url");
    const codeChallenge = crypto
      .createHash("sha256")
      .update(codeVerifier)
      .digest("base64url");

    const cookieHeader = await setOAuthCodeVerifier(request, codeVerifier);

    const oauthUrl = new URL(`${supabaseUrl}/auth/v1/authorize`);
    oauthUrl.searchParams.set("provider", "google");
    oauthUrl.searchParams.set("redirect_to", `${origin}/auth/callback`);
    oauthUrl.searchParams.set("code_challenge", codeChallenge);
    oauthUrl.searchParams.set("code_challenge_method", "S256");

    throw redirect(oauthUrl.toString(), {
      headers: { "Set-Cookie": cookieHeader },
    });
  }

  const parsed = parseFormData(formData, loginSchema);
  if (!parsed.success) {
    return data(
      {
        errors: parsed.errors,
        formError: null as string | null,
        values: {
          email: String(formData.get("email") ?? ""),
        },
      },
      { status: 400 }
    );
  }

  const { email, password } = parsed.data;
  const supabase = createSupabaseServer();
  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !authData.session) {
    return data(
      {
        errors: null,
        formError: "Invalid email or password.",
        values: { email },
      },
      { status: 400 }
    );
  }

  const cookie = await setSupabaseSession(
    request,
    authData.user.id,
    authData.session.access_token,
    authData.session.refresh_token
  );
  throw redirect("/browse", { headers: { "Set-Cookie": cookie } });
}

export default function Login() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link to="/" className="text-2xl font-bold tracking-tight">
            Olim
          </Link>
          <h1 className="mt-4 text-xl font-semibold">Welcome back</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Log in to continue your search
          </p>
        </div>

        <Card>
          <CardContent className="p-6 space-y-4">
            <Form method="post">
              <input type="hidden" name="intent" value="google" />
              <Button
                type="submit"
                variant="outline"
                className="w-full"
                disabled={isSubmitting}
              >
                <svg
                  className="mr-2 size-4"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
            </Form>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">or</span>
              </div>
            </div>

            <Form method="post" className="space-y-4">
              {actionData?.formError && (
                <p className="text-sm text-destructive text-center">
                  {actionData.formError}
                </p>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Email
                </label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  defaultValue={actionData?.values?.email ?? ""}
                  aria-invalid={!!actionData?.errors?.email}
                />
                {actionData?.errors?.email && (
                  <p className="mt-1 text-sm text-destructive">
                    {actionData.errors.email}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium"
                >
                  Password
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Your password"
                  aria-invalid={!!actionData?.errors?.password}
                />
                {actionData?.errors?.password && (
                  <p className="mt-1 text-sm text-destructive">
                    {actionData.errors.password}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isSubmitting}
              >
                {isSubmitting ? "Logging in…" : "Log In"}
              </Button>
            </Form>
          </CardContent>
        </Card>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link
            to="/signup"
            className="font-medium text-primary hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}
