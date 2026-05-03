import { Link } from "react-router";
import { redirect } from "react-router";
import type { Route } from "./+types/interview";
import { getSupabaseUserId } from "~/lib/session";

export function meta() {
  return [{ title: "Interview — Olim" }];
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getSupabaseUserId(request);
  if (!userId) throw redirect("/login");
  return {};
}

export default function Interview() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="text-center">
        <Link to="/" className="text-2xl font-bold tracking-tight">
          Olim
        </Link>
        <p className="mt-4 text-muted-foreground">
          Interview — coming soon.
        </p>
        <p className="mt-4">
          <Link to="/browse" className="text-sm text-primary hover:underline">
            Browse listings
          </Link>
        </p>
      </div>
    </div>
  );
}
