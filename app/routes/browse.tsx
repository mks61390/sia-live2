import { Link } from "react-router";
import { redirect } from "react-router";
import type { Route } from "./+types/browse";
import { getSupabaseUserId } from "~/lib/session";

export function meta() {
  return [{ title: "Browse listings — Olim" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getSupabaseUserId(request);
  if (!userId) throw redirect("/login");
  return {};
}

export default function Browse() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="text-center">
        <Link to="/" className="text-2xl font-bold tracking-tight">
          Olim
        </Link>
        <p className="mt-4 text-muted-foreground">
          Browse listings — coming soon.
        </p>
        <p className="mt-4">
          <Link to="/preferences" className="text-sm text-primary hover:underline">
            Set your preferences
          </Link>
        </p>
      </div>
    </div>
  );
}
