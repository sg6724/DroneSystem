import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Mail,
  MapPinned,
  Play,
  RadioTower,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

const HERO_IMAGE =
  "https://images.unsplash.com/photo-1527862316562-c741a118ac51?auto=format&fit=crop&w=2200&q=90";
const FIELD_IMAGE =
  "https://images.unsplash.com/photo-1751861951498-1d6b8b847d1f?auto=format&fit=crop&w=1200&q=85";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-[#070b09] text-white selection:bg-amber-300/40">
      <section
        className="relative min-h-[680px] overflow-hidden bg-cover bg-center"
        style={{ backgroundImage: `url(${HERO_IMAGE})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-[#070b09]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_20%,rgba(255,184,53,.28),transparent_28%)]" />
        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-7 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 tracking-tight">
            <span className="grid h-10 w-10 place-items-center rounded-xl border border-white/30 bg-white/10 backdrop-blur">
              <RadioTower className="h-5 w-5 text-amber-300" />
            </span>
            <span>
              <strong className="block text-base tracking-[0.12em]">SKYGRID</strong>
              <span className="block text-[9px] tracking-[0.32em] text-white/65">AERIAL INTELLIGENCE</span>
            </span>
          </Link>
          <div className="hidden items-center gap-7 text-xs font-semibold text-white/85 md:flex">
            <a href="#workflow" className="hover:text-amber-300">Platform</a>
            <a href="#fieldwork" className="hover:text-amber-300">Fieldwork</a>
            <a href="#results" className="hover:text-amber-300">Results</a>
          </div>
          <Link href="/login" className="rounded-full border border-white/35 bg-black/20 px-4 py-2 text-xs font-bold backdrop-blur transition hover:bg-white hover:text-black">
            Sign in
          </Link>
        </nav>

        <div className="relative z-10 mx-auto flex min-h-[540px] max-w-6xl items-center px-6 pb-16 lg:px-8">
          <div className="max-w-2xl">
            <span className="mb-5 inline-flex items-center gap-2 rounded-full border border-amber-200/30 bg-black/20 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-100 backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-amber-300" /> Survey operations, elevated
            </span>
            <h1 className="max-w-xl text-5xl font-black uppercase leading-[.88] tracking-[-0.055em] sm:text-6xl lg:text-7xl">
              Every flight.
              <br />
              <span className="text-amber-300">One clear view.</span>
            </h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-white/80">
              Plan repeatable surveys, command aircraft in real time, and turn every field flight into evidence your team can act on.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/signup" className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-5 py-3 text-sm font-extrabold text-black transition hover:bg-amber-300">
                Start a mission <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#workflow" className="inline-flex items-center gap-2 rounded-full border border-white/35 bg-black/20 px-5 py-3 text-sm font-bold backdrop-blur transition hover:bg-white/15">
                <Play className="h-4 w-4 fill-current" /> See how it works
              </a>
            </div>
          </div>
        </div>
      </section>

      <section id="workflow" className="bg-[#0c100e] py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 lg:grid-cols-[1.1fr_.9fr] lg:px-8">
          <div>
            <p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Mission workflow</p>
            <h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight sm:text-5xl">From site plan to<br />proof of work.</h2>
            <p className="mt-5 max-w-xl leading-relaxed text-white/65">SkyGrid pairs a fast operational workflow with a live flight surface. Teams get the clarity of a campaign control room without the overhead of switching tools.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                [MapPinned, "Define", "Draw a site and build a repeatable route."],
                [RadioTower, "Deploy", "Watch flight health and progress live."],
                [BarChart3, "Decide", "Review coverage and captured evidence."],
              ].map(([Icon, title, text]) => {
                const IconComponent = Icon as typeof MapPinned;
                return <div key={title as string} className="border-l border-amber-300/70 pl-4">
                  <IconComponent className="h-5 w-5 text-amber-300" />
                  <h3 className="mt-3 font-bold uppercase">{title as string}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-white/55">{text as string}</p>
                </div>;
              })}
            </div>
          </div>
          <div className="relative min-h-80 overflow-hidden rounded-2xl border border-white/10 bg-[#171b17] shadow-2xl">
            <div className="absolute inset-0 bg-cover bg-center opacity-75" style={{ backgroundImage: `url(${FIELD_IMAGE})` }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20" />
            <div className="absolute bottom-5 left-5 right-5 rounded-xl border border-white/15 bg-black/55 p-4 backdrop-blur">
              <div className="flex items-center justify-between text-xs"><span className="font-bold">ACTIVE FIELD RUN</span><span className="text-amber-300">LIVE</span></div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/15"><div className="h-full w-[72%] rounded-full bg-amber-300" /></div>
              <div className="mt-2 flex justify-between text-[11px] text-white/60"><span>Coverage 72%</span><span>Battery 86%</span><span>04:12 remaining</span></div>
            </div>
          </div>
        </div>
      </section>

      <section id="fieldwork" className="border-y border-black/10 bg-amber-400 py-14 text-black">
        <div className="mx-auto flex max-w-6xl flex-col gap-7 px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <div><p className="text-xs font-black uppercase tracking-[.18em]">Built for teams in the field</p><h2 className="mt-2 text-3xl font-black uppercase tracking-tight">Mission confidence, before takeoff.</h2></div>
          <div className="flex flex-wrap gap-x-7 gap-y-3 text-sm font-bold">
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Geospatial planning</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Live telemetry</span>
            <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Audit-ready metrics</span>
          </div>
        </div>
      </section>

      <section id="results" className="bg-[#f7f4ed] py-20 text-[#191b17]">
        <div className="mx-auto max-w-6xl px-6 lg:px-8">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-[#a96d06]">Aerial intelligence</p><h2 className="mt-2 text-4xl font-black uppercase tracking-tight">Work that speaks clearly.</h2></div><Link href="/login" className="inline-flex items-center gap-2 text-sm font-extrabold underline decoration-amber-500 decoration-2 underline-offset-4">Open operations <ArrowRight className="h-4 w-4" /></Link></div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {["Site inspection", "Asset survey", "Progress capture"].map((title, index) => <article key={title} className="group overflow-hidden rounded-xl bg-[#22251f] text-white shadow-lg"><div className="h-44 bg-cover bg-center transition duration-500 group-hover:scale-105" style={{ backgroundImage: `linear-gradient(rgba(0,0,0,.15),rgba(0,0,0,.35)), url(${index === 1 ? FIELD_IMAGE : HERO_IMAGE})` }} /><div className="p-5"><p className="text-[10px] font-bold uppercase tracking-[.16em] text-amber-300">SkyGrid fieldwork</p><h3 className="mt-2 text-xl font-black uppercase">{title}</h3><p className="mt-2 text-sm text-white/60">Clear routes, aircraft health, and proof of coverage in one mission record.</p></div></article>)}
          </div>
        </div>
      </section>

      <section className="bg-[#0c100e] py-20">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-2 lg:px-8"><div><p className="text-xs font-bold uppercase tracking-[.2em] text-amber-300">Ready when your site is</p><h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight">Bring every field mission into focus.</h2><p className="mt-5 max-w-md leading-relaxed text-white/60">Create your organization, assign a fleet, and start planning the next survey in minutes.</p></div><div className="rounded-2xl border border-white/10 bg-white/[.04] p-6"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-300 text-black"><Mail className="h-5 w-5" /></span><div><h3 className="font-bold">Talk to the mission team</h3><p className="text-sm text-white/55">We&apos;ll help you set up your first operational workspace.</p></div></div><div className="mt-6 flex flex-wrap gap-3"><Link href="/signup" className="rounded-full bg-amber-400 px-5 py-3 text-sm font-extrabold text-black hover:bg-amber-300">Create workspace</Link><a href="mailto:ops@skygrid.example" className="rounded-full border border-white/20 px-5 py-3 text-sm font-bold hover:bg-white/10">Email operations</a></div></div></div>
      </section>
      <footer className="border-t border-white/10 bg-[#070b09] py-8"><div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 text-xs text-white/45 sm:flex-row sm:items-center sm:justify-between lg:px-8"><span className="font-bold tracking-[.18em] text-white/70">SKYGRID AERIAL INTELLIGENCE</span><span>Mission planning · Live operations · Survey insight</span><ShieldCheck className="h-4 w-4 text-amber-300" /></div></footer>
    </main>
  );
}
