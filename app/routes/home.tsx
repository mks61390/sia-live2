import { Link } from "react-router";
import { redirect } from "react-router";
import type { Route } from "./+types/home";
import { getSupabaseUserId } from "~/lib/session";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sia — Voice-matched apartments in Tel Aviv" },
    {
      name: "description",
      content:
        "Describe your ideal home in Tel Aviv and Sia's AI matches you with curated rentals across the city — from Neve Tzedek to Ramat Gan.",
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

const listings = [
  {
    name: "Bialik Square",
    type: "2 BR · Restored Bauhaus",
    price: "11,200 ₪",
    img: "https://siatlv.lovable.app/assets/listing-1-Djs3xekd.jpg",
  },
  {
    name: "Florentin Loft",
    type: "Studio · Industrial Modern",
    price: "8,900 ₪",
    img: "https://siatlv.lovable.app/assets/listing-2-CSmFZxb7.jpg",
  },
  {
    name: "Rothschild Penthouse",
    type: "3 BR · Wraparound Terrace",
    price: "24,000 ₪",
    img: "https://siatlv.lovable.app/assets/listing-3-zxdJEyVc.jpg",
  },
  {
    name: "Geula Beach House",
    type: "1 BR · Sea View",
    price: "9,500 ₪",
    img: "https://siatlv.lovable.app/assets/listing-4-BEnaAlGl.jpg",
  },
];

const neighborhoods = [
  "Neve Tzedek",
  "Florentin",
  "Lev Ha'ir",
  "Rothschild",
  "Yaffo",
  "Ramat Aviv",
  "Ramat Gan",
  "Givatayim",
  "Holon",
  "Bat Yam",
  "Herzliya",
  "Petah Tikva",
];

export default function Home() {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      {/* Nav */}
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 md:px-10">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-full bg-clay" />
          <span className="font-serif text-xl font-semibold uppercase tracking-tight">Sia</span>
        </div>
        <div className="hidden items-center gap-10 text-sm font-medium tracking-wide text-foreground/75 md:flex">
          <a href="#how" className="transition-colors hover:text-clay">
            How it works
          </a>
          <a href="#listings" className="transition-colors hover:text-clay">
            Listings
          </a>
          <a href="#neighborhoods" className="transition-colors hover:text-clay">
            Neighborhoods
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to="/signup"
            className="rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Get Started
          </Link>
          <Link
            to="/signup"
            className="hidden sm:inline-flex rounded-full border border-border px-5 py-2.5 text-sm font-medium transition-colors hover:bg-secondary"
          >
            For Owners
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="mx-auto max-w-7xl px-6 pt-12 pb-24 md:px-10 md:pt-20 md:pb-32">
        <div className="grid grid-cols-12 items-end gap-8 lg:gap-12">
          <div className="col-span-12 lg:col-span-7">
            {/* Location badge */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-medium tracking-wide text-foreground/70">
              <span className="size-1.5 rounded-full bg-clay" />
              Tel Aviv · Ramat Gan · Holon · Bat Yam
            </div>

            <h1 className="text-balance font-serif text-5xl leading-[1.05] tracking-tight md:text-7xl">
              Your home in the city,{" "}
              <span className="font-light italic text-clay-deep">found by word of mouth.</span>
            </h1>

            <p className="mt-6 max-w-[44ch] text-pretty text-lg leading-relaxed text-foreground/70 md:mt-8">
              Describe your ideal morning. The breeze off the Mediterranean, the quiet of a
              back-alley in Neve Tzedek, the energy of Rothschild. Sia listens — then finds it.
            </p>

            {/* Voice input box */}
            <div className="group relative mt-10 max-w-xl md:mt-12">
              <div className="absolute -inset-4 rounded-3xl bg-secondary/40 blur-2xl transition-all duration-500 group-hover:bg-secondary/60" />
              <div
                className="relative flex items-center gap-5 rounded-2xl border border-border bg-card p-4 md:p-5"
                style={{ boxShadow: "var(--shadow-soft)" }}
              >
                {/* Waveform bars */}
                <div className="flex shrink-0 items-end gap-1.5">
                  <span className="h-4 w-1 rounded-full bg-clay/30" />
                  <span className="h-8 w-1 rounded-full bg-clay/60" />
                  <span className="h-12 w-1 rounded-full bg-clay" />
                  <span className="h-6 w-1 rounded-full bg-clay/40" />
                  <span className="h-10 w-1 rounded-full bg-clay/70" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold uppercase tracking-widest text-clay">
                    Tap to speak
                  </p>
                  <p className="mt-0.5 truncate text-sm italic text-foreground/55">
                    "A high-ceiling loft near Shuk HaCarmel, under 11k…"
                  </p>
                </div>
                <Link
                  to="/signup"
                  className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground transition-transform hover:scale-105"
                >
                  Start
                </Link>
              </div>
            </div>

            {/* Stats row */}
            <div className="mt-8 flex flex-wrap items-center gap-x-8 gap-y-3 text-xs font-medium uppercase tracking-widest text-foreground/50">
              <span>Voice → JSON in seconds</span>
              <span className="size-1 rounded-full bg-foreground/20" />
              <span>Saved for future matches</span>
              <span className="size-1 rounded-full bg-foreground/20" />
              <span>1,400+ verified listings</span>
            </div>
          </div>

          {/* Hero image */}
          <div className="col-span-12 hidden lg:col-span-5 lg:block">
            <div className="relative">
              <div className="absolute -left-12 -top-12 size-32 rounded-full bg-clay/10 blur-3xl" />
              <div
                className="relative aspect-[4/5] overflow-hidden rounded-2xl bg-secondary rotate-2 transition-transform duration-700 hover:rotate-0"
                style={{ boxShadow: "var(--shadow-elevated)" }}
              >
                <img
                  src="https://siatlv.lovable.app/assets/hero-apartment-BPO1C7te.jpg"
                  alt="Sunlit Tel Aviv apartment with high ceilings"
                  width="1024"
                  height="1280"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-7 text-white">
                  <p className="font-serif text-2xl">Shabazi Street</p>
                  <p className="text-xs font-medium uppercase tracking-widest opacity-90">
                    Neve Tzedek · 14,500 ₪
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-7xl px-6 pb-24 md:px-10 md:pb-32">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-3 md:gap-16">
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-clay">
              01. Confide
            </span>
            <h3 className="font-serif text-2xl">Speak your truth</h3>
            <p className="text-sm leading-relaxed text-foreground/65">
              Budget and bedrooms are just the start. Tell us about the light you need, the commute
              you enjoy, the neighborhood vibe that feels like you.
            </p>
          </div>
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-clay">
              02. Interpret
            </span>
            <h3 className="font-serif text-2xl">AI contextualizing</h3>
            <p className="text-sm leading-relaxed text-foreground/65">
              Our engine translates your voice into a structured search profile, scanning listings
              across Tel Aviv, Ramat Gan, Holon and Bat Yam for matches.
            </p>
          </div>
          <div className="space-y-3">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-clay">
              03. Arrive
            </span>
            <h3 className="font-serif text-2xl">The right home</h3>
            <p className="text-sm leading-relaxed text-foreground/65">
              Skip the endless scroll. Sia presents a tight, curated grid of homes that fit your
              life — and saves your profile for new listings as they hit the market.
            </p>
          </div>
        </div>
      </section>

      {/* Listings */}
      <section
        id="listings"
        className="mx-auto max-w-7xl border-t border-border px-6 py-20 md:px-10 md:py-28"
      >
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="font-serif text-4xl md:text-5xl">Currently trending in Lev Ha'ir</h2>
            <p className="mt-2 text-foreground/55">
              Matched on morning sun and proximity to culture.
            </p>
          </div>
          <Link
            to="/browse"
            className="border-b border-clay pb-1 text-sm font-semibold transition-colors hover:text-clay"
          >
            View all curated homes →
          </Link>
        </div>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {listings.map((listing) => (
            <Link to="/browse" key={listing.name} className="group cursor-pointer">
              <div className="mb-4 aspect-[3/4] overflow-hidden rounded-lg bg-secondary">
                <img
                  src={listing.img}
                  alt={listing.name}
                  loading="lazy"
                  width="600"
                  height="800"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
              </div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-serif text-lg leading-tight">{listing.name}</h4>
                  <p className="mt-0.5 text-sm text-foreground/55">{listing.type}</p>
                </div>
                <span className="shrink-0 font-medium tabular-nums text-clay">{listing.price}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Neighborhoods */}
      <section
        id="neighborhoods"
        className="mx-auto max-w-7xl border-t border-border px-6 py-20 md:px-10 md:py-28"
      >
        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-5">
            <h2 className="font-serif text-4xl leading-tight md:text-5xl">
              From Florentin to{" "}
              <span className="italic text-clay-deep">Bat Yam.</span>
            </h2>
            <p className="mt-6 max-w-[40ch] text-foreground/65">
              Sia covers Tel Aviv and the greater metro — wherever the right apartment for your life
              happens to be. Save your preferences once, and we'll surface new listings as they
              appear on the market.
            </p>
          </div>
          <div className="col-span-12 grid grid-cols-2 gap-3 md:col-span-7 md:grid-cols-3">
            {neighborhoods.map((n) => (
              <div
                key={n}
                className="rounded-lg border border-border bg-card/50 px-4 py-3 text-sm font-medium transition-colors hover:border-clay hover:text-clay"
              >
                {n}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-24 md:px-10 md:pb-32">
        <div className="rounded-3xl bg-primary px-8 py-16 text-center text-primary-foreground md:px-16 md:py-24">
          <h2 className="mx-auto max-w-3xl text-balance font-serif text-4xl leading-tight md:text-6xl">
            Stop scrolling.{" "}
            <span className="italic text-clay">Start describing.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-primary-foreground/70">
            Record a 30-second voice note. We'll do the rest, today and every time something new
            comes up.
          </p>
          <Link
            to="/signup"
            className="mt-10 inline-flex items-center gap-3 rounded-full bg-clay px-8 py-4 font-medium text-primary-foreground transition-transform hover:scale-[1.03]"
          >
            <span className="size-2 rounded-full bg-primary-foreground" />
            Record your preferences
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-6 px-6 py-10 md:flex-row md:px-10">
          <div className="flex items-center gap-2">
            <div className="size-6 rounded-full bg-clay" />
            <span className="font-serif text-lg font-semibold uppercase tracking-tight">Sia</span>
          </div>
          <p className="text-xs uppercase tracking-[0.2em] text-foreground/40">
            Built with craft in Tel Aviv · © 2026
          </p>
          <div className="flex gap-6 text-xs font-semibold uppercase tracking-widest text-foreground/55">
            <a href="#" className="hover:text-clay">
              Instagram
            </a>
            <a href="#" className="hover:text-clay">
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
