import { Link } from "react-router";
import { redirect } from "react-router";
import type { Route } from "./+types/home";
import { getSupabaseUserId } from "~/lib/session";
import { Button } from "~/components/ui/button";
import { Mic, ArrowRight, MapPin } from "lucide-react";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Sia — Find your apartment in Tel Aviv" },
    {
      name: "description",
      content:
        "AI-powered apartment search for English-speaking immigrants to Israel. Describe what you need and Sia finds your perfect home.",
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
  { name: "Bialik Square", type: "2BR · Bauhaus", price: "11,200₪", tag: "Classic" },
  { name: "Florentin Loft", type: "Studio · Industrial", price: "8,900₪", tag: "Trending" },
  { name: "Rothschild Penthouse", type: "3BR · Terrace", price: "24,000₪", tag: "Premium" },
  { name: "Geula Beach House", type: "1BR · Sea View", price: "9,500₪", tag: "Coastal" },
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

const steps = [
  {
    num: "01",
    title: "Confide",
    subtitle: "Speak your truth",
    desc: "Tell us more than the basics. Share what kind of morning you want, what sounds you can live with, what light matters to you.",
  },
  {
    num: "02",
    title: "Interpret",
    subtitle: "AI contextualizing",
    desc: "Your words become structured preferences — neighborhood affinity, budget flexibility, lifestyle signals — refined by context.",
  },
  {
    num: "03",
    title: "Arrive",
    subtitle: "The right home",
    desc: "We surface only listings that match your full picture. Not a list. A shortlist. 1,400+ verified listings, curated for you.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-white text-[#1a1a1a]">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-sm border-b border-neutral-100">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Sia
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm text-neutral-500">
            <a href="#how-it-works" className="hover:text-neutral-900 transition-colors">
              How it works
            </a>
            <Link to="/browse" className="hover:text-neutral-900 transition-colors">
              Listings
            </Link>
            <a href="#neighborhoods" className="hover:text-neutral-900 transition-colors">
              Neighborhoods
            </a>
          </nav>
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden md:flex text-neutral-500 hover:text-neutral-900"
            >
              <Link to="/signup">For Owners</Link>
            </Button>
            <Button
              size="sm"
              asChild
              className="bg-[#1a1a1a] text-white hover:bg-neutral-800 rounded-full px-5"
            >
              <Link to="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="pt-36 pb-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight leading-[1.08] text-[#1a1a1a]">
                Your home in the city, found by word of mouth.
              </h1>
              <p className="mt-6 text-lg text-neutral-500 leading-relaxed max-w-md">
                Mediterranean breeze, quiet alleyways, urban energy — Neve Tzedek, Rothschild,
                Florentin. Describe it in your own words.
              </p>

              {/* Voice input */}
              <div className="mt-10 flex items-center gap-3 bg-neutral-50 border border-neutral-200 rounded-2xl px-5 py-4 max-w-md">
                <div className="flex size-9 items-center justify-center rounded-full bg-[#1a1a1a] flex-shrink-0">
                  <Mic className="size-4 text-white" />
                </div>
                <span className="text-neutral-400 text-sm flex-1 truncate">
                  "A high-ceiling loft near Shuk HaCarmel, under 11k…"
                </span>
                <Button
                  size="sm"
                  asChild
                  className="bg-[#1a1a1a] text-white hover:bg-neutral-800 rounded-full px-4 flex-shrink-0"
                >
                  <Link to="/signup">Start</Link>
                </Button>
              </div>

              <div className="mt-6 flex items-center gap-2 text-sm text-neutral-400">
                <MapPin className="size-3.5" />
                <span>Tel Aviv · Ramat Gan · Holon · Bat Yam</span>
              </div>
            </div>

            {/* Hero image */}
            <div className="relative hidden lg:block">
              <div className="aspect-[4/3] rounded-3xl overflow-hidden bg-neutral-100">
                <img
                  src="https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80"
                  alt="Sunlit Tel Aviv apartment with high ceilings"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-xl px-4 py-2 text-sm font-medium text-neutral-700 shadow-sm">
                📍 Shabazi Street
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 px-6 bg-neutral-50">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight text-center mb-16">How it works</h2>
          <div className="grid md:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div
                key={step.num}
                className="bg-white rounded-2xl p-8 border border-neutral-100"
              >
                <span className="text-xs font-mono text-neutral-300 tracking-widest">
                  {step.num}
                </span>
                <h3 className="mt-3 text-xl font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm font-medium text-neutral-400">{step.subtitle}</p>
                <p className="mt-4 text-sm text-neutral-500 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Listings */}
      <section className="py-24 px-6">
        <div className="mx-auto max-w-6xl">
          <div className="flex items-end justify-between mb-12">
            <h2 className="text-3xl font-bold tracking-tight">Currently trending in Lev Ha'ir</h2>
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="text-neutral-400 hover:text-neutral-700 hidden sm:flex items-center gap-1"
            >
              <Link to="/browse">
                View all <ArrowRight className="size-3.5 ml-1" />
              </Link>
            </Button>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {listings.map((listing) => (
              <Link
                to="/browse"
                key={listing.name}
                className="group rounded-2xl border border-neutral-100 overflow-hidden hover:border-neutral-300 transition-colors cursor-pointer"
              >
                <div className="aspect-[4/3] bg-neutral-100 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-neutral-200 to-neutral-300 flex items-center justify-center">
                    <span className="text-neutral-400 text-xs font-medium">{listing.name}</span>
                  </div>
                  <span className="absolute top-3 left-3 bg-white/90 text-[10px] font-semibold text-neutral-600 rounded-full px-2.5 py-1">
                    {listing.tag}
                  </span>
                </div>
                <div className="p-4">
                  <h4 className="font-semibold text-sm">{listing.name}</h4>
                  <p className="text-xs text-neutral-400 mt-0.5">{listing.type}</p>
                  <p className="text-sm font-bold mt-2">
                    {listing.price}
                    <span className="font-normal text-neutral-400">/mo</span>
                  </p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Neighborhoods */}
      <section id="neighborhoods" className="py-24 px-6 bg-neutral-50">
        <div className="mx-auto max-w-6xl">
          <h2 className="text-3xl font-bold tracking-tight mb-4">From Florentin to Bat Yam.</h2>
          <p className="text-neutral-500 mb-12">
            We cover the full stretch of greater Tel Aviv — 12 neighborhoods and growing.
          </p>
          <div className="flex flex-wrap gap-3">
            {neighborhoods.map((n) => (
              <span
                key={n}
                className="bg-white border border-neutral-200 text-sm text-neutral-600 rounded-full px-4 py-2"
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-32 px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
            Stop scrolling.
            <br />
            Start describing.
          </h2>
          <p className="mt-6 text-lg text-neutral-500">30 seconds. Your voice. The right home.</p>
          <div className="mt-10">
            <Button
              size="lg"
              asChild
              className="bg-[#1a1a1a] text-white hover:bg-neutral-800 rounded-full px-8"
            >
              <Link to="/signup">Record your preferences</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-neutral-100 py-10 px-6">
        <div className="mx-auto max-w-6xl flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-neutral-400">
          <span>© 2026 Sia</span>
          <span>Built with craft in Tel Aviv</span>
          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-neutral-600 transition-colors">
              Instagram
            </a>
            <a href="#" className="hover:text-neutral-600 transition-colors">
              Privacy
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
