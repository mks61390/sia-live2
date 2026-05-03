import { Link } from "react-router";
import { redirect } from "react-router";
import type { Route } from "./+types/home";
import { getSupabaseUserId } from "~/lib/session";
import { Button } from "~/components/ui/button";
import { Mic, BellRing, Sparkles } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Olim — Find your apartment in Israel" },
    {
      name: "description",
      content:
        "AI-powered apartment search designed for English-speaking immigrants to Israel. Find your perfect home faster.",
    },
  ];
}

export async function loader({ request }: Route.LoaderArgs) {
  const userId = await getSupabaseUserId(request);
  if (userId !== null) {
    throw redirect("/browse");
  }
  return {};
}

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="text-xl font-bold tracking-tight">
            Olim
          </Link>
          <Button asChild size="sm">
            <Link to="/signup">Get Started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-5xl px-6 py-24 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
          Find your apartment
          <br />
          <span className="text-muted-foreground">in Israel</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          AI-powered apartment search built for English-speaking immigrants.
          Describe what you need — in your own words — and Olim matches you with
          the right listings across Tel Aviv and beyond.
        </p>
        <div className="mt-10">
          <Button asChild size="lg">
            <Link to="/signup">Get Started</Link>
          </Button>
        </div>
      </section>

      {/* Feature callouts */}
      <section className="border-t border-border bg-muted/40 py-20">
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-10 px-6 sm:grid-cols-3">
          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10">
              <Sparkles className="size-6 text-primary" />
            </div>
            <h3 className="font-semibold">AI Matching</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Tell us your budget, neighbourhood preferences, and lifestyle
              signals. Our model ranks every listing by how well it fits you.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10">
              <Mic className="size-6 text-primary" />
            </div>
            <h3 className="font-semibold">Voice Input</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Just speak — describe what you're looking for in plain English and
              we'll extract your preferences automatically.
            </p>
          </div>

          <div className="flex flex-col items-center text-center">
            <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10">
              <BellRing className="size-6 text-primary" />
            </div>
            <h3 className="font-semibold">Real-time Alerts</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              New listings that match your profile hit your inbox the moment
              they're published on Yad2 — no more daily refresh.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="mx-auto max-w-5xl px-6 text-center text-sm text-muted-foreground">
          Olim
        </div>
      </footer>
    </div>
  );
}
