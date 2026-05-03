import { Form, Link, Outlet, useLoaderData, useLocation } from "react-router";
import { redirect } from "react-router";
import type { Route } from "./+types/layout.sia";
import { getSupabaseUserId } from "~/lib/session";
import { createSupabaseServiceServer } from "~/lib/supabase.server";

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getSupabaseUserId(request);
  if (!userId) throw redirect("/login");

  const supabase = createSupabaseServiceServer();

  const [profileRes, unreadRes] = await Promise.all([
    supabase
      .from("tenant_profiles")
      .select("completed_blocks")
      .eq("tenant_id", userId)
      .maybeSingle(),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", userId)
      .is("read_at", null),
  ]);

  const completedBlocks = (profileRes.data?.completed_blocks as number) ?? 0;
  const unreadCount = unreadRes.count ?? 0;

  return { completedBlocks, unreadCount };
}

export default function SiaLayout() {
  const { completedBlocks, unreadCount } = useLoaderData<typeof loader>();
  const location = useLocation();
  const showFullNav = completedBlocks >= 1;

  const isActive = (path: string) => location.pathname === path;
  const linkClass = (path: string) =>
    `text-sm hover:text-foreground hover:underline ${
      isActive(path) ? "text-foreground font-medium" : "text-muted-foreground"
    }`;

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3 sm:px-6">
          <Link to={showFullNav ? "/browse" : "/"} className="text-xl font-bold tracking-tight">
            Olim
          </Link>

          <nav className="flex items-center gap-5">
            {showFullNav && (
              <>
                <Link to="/browse" className={linkClass("/browse")}>
                  Browse
                </Link>
                <Link to="/saved" className={linkClass("/saved")}>
                  Saved
                </Link>
                <Link to="/notifications" className={`${linkClass("/notifications")} relative`}>
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-1 inline-flex items-center justify-center rounded-full bg-primary px-1.5 py-0.5 text-xs font-medium text-primary-foreground">
                      {unreadCount}
                    </span>
                  )}
                </Link>
                <Link to="/interview" className={linkClass("/interview")}>
                  Preferences
                </Link>
              </>
            )}
            <Form method="post" action="/api/logout">
              <button
                type="submit"
                className="text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                Log out
              </button>
            </Form>
          </nav>
        </div>
      </header>

      <Outlet />
    </div>
  );
}
