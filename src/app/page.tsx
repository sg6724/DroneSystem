"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Crosshair,
  Layers3,
  Mail,
  MapPinned,
  Play,
  RadioTower,
  ShieldCheck,
} from "lucide-react";
import DroneScene from "@/components/drone-scene";

export default function LandingPage() {
  return (
    <main className="min-h-screen overflow-x-hidden bg-[#07111f] text-white">
      <div className="relative isolate overflow-x-hidden bg-[radial-gradient(ellipse_90%_70%_at_74%_0%,#183a36_0%,#0b1929_42%,#07111f_78%)]">
        <div className="absolute inset-0 -z-10 opacity-30 [background-image:linear-gradient(rgba(148,163,184,.09)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,.09)_1px,transparent_1px)] [background-size:64px_64px] [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />
        {/* Top nav */}
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-5 sm:px-6 lg:px-8">
          <Link href="/" className="group flex items-center gap-3">
            <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl border border-emerald-200/20 bg-emerald-400 shadow-[0_8px_24px_rgba(16,185,129,.2)] transition-transform group-hover:scale-105">
              <img src="/skygrid-mark.svg" alt="SkyGrid" className="h-full w-full" />
            </span>
            <span>
              <strong className="block text-[15px] font-bold tracking-[0.1em] text-white">SKYGRID</strong>
              <span className="block text-[9px] font-medium tracking-[0.2em] text-slate-400">AERIAL OPERATIONS</span>
            </span>
          </Link>
          <div className="hidden items-center gap-1 rounded-full border border-white/10 bg-slate-950/30 p-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-300 shadow-lg shadow-black/10 backdrop-blur-md md:flex">
            <a href="#workflow" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">Platform</a>
            <a href="#fieldwork" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">Fieldwork</a>
            <a href="#results" className="rounded-full px-4 py-2 transition hover:bg-white/10 hover:text-white">Results</a>
          </div>
          <Link href="/login" className="rounded-full border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-black/10 backdrop-blur-md transition hover:border-white/30 hover:bg-white/10">Sign in</Link>
        </nav>

        {/* Hero */}
        <section className="mx-auto max-w-7xl px-5 pb-20 pt-16 sm:px-6 sm:pt-20 lg:px-8 lg:pb-28">
          <div className="grid items-center gap-12 lg:grid-cols-[.82fr_1.18fr] lg:gap-14">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-8"
            >
              <p className="text-xs font-semibold uppercase tracking-[.18em] text-emerald-300">Command center for aerial teams</p>
              <h1 className="max-w-xl text-5xl font-semibold leading-[1.04] tracking-[-0.055em] text-white sm:text-6xl lg:text-[4.25rem]">
                Every mission.<br />
                <span className="text-emerald-400">A complete picture.</span>
              </h1>
              <p className="max-w-lg text-lg leading-8 text-slate-300">
                Plan, fly, and verify from one operational workspace. SkyGrid gives your field team a clear view of every aircraft, site, and outcome.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link
                  href="/signup"
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-5 py-3 text-sm font-semibold text-[#062119] transition hover:bg-emerald-300"
                >
                  Get started <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="#workflow"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-600/80 bg-slate-950/20 px-5 py-3 text-sm font-semibold text-slate-100 transition hover:border-slate-400 hover:bg-white/5"
                >
                  <Play className="h-4 w-4 fill-current" /> Watch overview
                </a>
              </div>
            </motion.div>

            {/* 3D drone animation */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="relative h-[500px] w-full"
            >
              <DroneScene className="h-full w-full" />
            </motion.div>

            {/* Product command-surface preview */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="hidden"
            >
              <div className="absolute -inset-8 -z-10 rounded-full bg-emerald-400/10 blur-3xl" />
              <div className="overflow-hidden rounded-xl border border-white/15 bg-[#0a1625] p-2 shadow-2xl shadow-black/40">
                <div className="overflow-hidden rounded-lg border border-white/10 bg-[#0d1c2d]">
                  <div className="flex h-11 items-center justify-between border-b border-white/10 px-4 text-[11px] text-slate-400">
                    <div className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-emerald-400" /><span className="font-medium text-slate-200">Operations overview</span></div>
                    <span className="font-mono text-[10px]">AUG 17 · 14:26 UTC</span>
                  </div>
                  <div className="relative h-[330px] sm:h-[380px]">
                    <img src="https://images.unsplash.com/photo-1630522521616-b5b4cf458621?auto=format&fit=crop&w=1600&q=85" alt="Aerial view of an industrial facility" className="h-full w-full object-cover opacity-75" />
                    <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,17,31,.35),transparent_60%),linear-gradient(0deg,rgba(7,17,31,.68),transparent_45%)]" />
                    <div className="absolute left-[31%] top-[26%] h-24 w-36 rounded-[50%] border border-emerald-300/90 bg-emerald-400/10 sm:h-32 sm:w-48" />
                    <div className="absolute left-[47%] top-[37%] grid h-7 w-7 place-items-center rounded-full border border-white/75 bg-emerald-400 text-[#072018] shadow-lg"><Crosshair className="h-4 w-4" /></div>
                    <div className="absolute left-4 top-4 rounded-md border border-white/15 bg-[#091522]/90 px-3 py-2.5 backdrop-blur-sm">
                      <p className="text-[10px] font-medium uppercase tracking-[.14em] text-slate-400">Active mission</p>
                      <p className="mt-1 text-sm font-semibold text-white">North Terminal Inspection</p>
                    </div>
                    <div className="absolute bottom-4 left-4 right-4 grid gap-3 sm:grid-cols-[1.4fr_.8fr]">
                      <div className="rounded-md border border-white/15 bg-[#091522]/90 p-3.5 backdrop-blur-sm">
                        <div className="flex items-center justify-between"><span className="text-xs font-medium text-white">Coverage</span><span className="text-xs font-semibold text-emerald-300">78.4%</span></div>
                        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-700"><div className="h-full w-[78%] rounded-full bg-emerald-400" /></div>
                        <div className="mt-2 flex justify-between text-[10px] text-slate-400"><span>1.84 km flown</span><span>12 min remaining</span></div>
                      </div>
                      <div className="rounded-md border border-white/15 bg-[#091522]/90 p-3.5 backdrop-blur-sm"><div className="flex items-center gap-2 text-[10px] uppercase tracking-[.14em] text-slate-400"><Layers3 className="h-3.5 w-3.5 text-emerald-300" /> Data capture</div><p className="mt-2 text-sm font-semibold text-white">1,248 images</p><p className="mt-1 text-[10px] text-emerald-300">Syncing in real time</p></div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Workflow */}
        <section id="workflow" className="mt-32 py-20">
          <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:px-8 lg:grid-cols-[1.1fr_.9fr]">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-green-400">Mission workflow</p>
              <h2 className="mt-3 text-4xl font-bold uppercase leading-none tracking-tight sm:text-5xl">
                From site plan to<br />proof of work.
              </h2>
              <p className="mt-5 max-w-xl leading-relaxed text-gray-300">
                SkyGrid pairs a fast operational workflow with a live flight surface. Teams get the
                clarity of a campaign control room without the overhead of switching tools.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {[
                  [MapPinned, "Define", "Draw a site and build a repeatable route."],
                  [RadioTower, "Deploy", "Watch flight health and progress live."],
                  [BarChart3, "Decide", "Review coverage and captured evidence."],
                ].map(([Icon, title, text]) => {
                  const IconComponent = Icon as typeof MapPinned;
                  return (
                    <div key={title as string} className="border-l border-green-500/70 pl-4">
                      <IconComponent className="h-5 w-5 text-green-500" />
                      <h3 className="mt-3 font-bold uppercase">{title as string}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-gray-400">{text as string}</p>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="relative min-h-80 overflow-hidden rounded-lg border border-gray-700 shadow-lg">
              <img
                src="https://images.unsplash.com/photo-1527862316562-c741a118ac51?auto=format&fit=crop&w=1200&q=80"
                alt="Drone capturing an aerial survey of a construction site"
                className="absolute inset-0 h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-950/90 via-gray-900/30 to-transparent" />
              <div className="absolute bottom-5 left-5 right-5 rounded-lg border border-gray-700 bg-gray-900/70 p-4 backdrop-blur">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white">ACTIVE FIELD RUN</span>
                  <span className="flex items-center gap-1.5 text-green-400">
                    <span className="dot bg-green-400 live-pulse" /> LIVE
                  </span>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-gray-700">
                  <div className="h-full w-[72%] rounded-full bg-green-500" />
                </div>
                <div className="mt-2 flex justify-between text-[11px] text-gray-400">
                  <span>Coverage 72%</span>
                  <span>Battery 86%</span>
                  <span>04:12 remaining</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Fieldwork band */}
        <section id="fieldwork" className="border-y border-gray-800 bg-green-600 py-14 text-black">
          <div className="mx-auto flex max-w-7xl flex-col gap-7 px-4 sm:px-6 lg:px-8 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-xs font-black uppercase tracking-[.18em]">Built for teams in the field</p>
              <h2 className="mt-2 text-3xl font-black uppercase tracking-tight">Mission confidence, before takeoff.</h2>
            </div>
            <div className="flex flex-wrap gap-x-7 gap-y-3 text-sm font-bold">
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Geospatial planning</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Live telemetry</span>
              <span className="inline-flex items-center gap-2"><CheckCircle2 className="h-4 w-4" /> Audit-ready metrics</span>
            </div>
          </div>
        </section>

        {/* Results */}
        <section id="results" className="py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <div>
                <p className="text-xs font-bold uppercase tracking-[.2em] text-green-400">Aerial intelligence</p>
                <h2 className="mt-2 text-4xl font-black uppercase tracking-tight">Work that speaks clearly.</h2>
              </div>
              <Link href="/login" className="inline-flex items-center gap-2 text-sm font-extrabold underline decoration-green-500 decoration-2 underline-offset-4 text-white">
                Open operations <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-9 grid gap-5 md:grid-cols-3">
              {[
                ["Site inspection", "https://images.unsplash.com/photo-1473968512647-3e447244af8f?auto=format&fit=crop&w=900&q=80"],
                ["Asset survey", "https://images.unsplash.com/photo-1508614589041-895b88991e3e?auto=format&fit=crop&w=900&q=80"],
                ["Progress capture", "https://images.unsplash.com/photo-1527862316562-c741a118ac51?auto=format&fit=crop&w=900&q=80"],
              ].map(([title, img]) => (
                <article
                  key={title}
                  className="group overflow-hidden rounded-lg bg-gray-800/50 backdrop-blur-sm border border-gray-700 shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-1"
                >
                  <div className="relative h-40 overflow-hidden">
                    <img
                      src={img as string}
                      alt={`${title as string} — aerial drone survey`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-950/80 to-transparent" />
                  </div>
                  <div className="p-6">
                    <div className="w-10 h-10 rounded-lg bg-green-500/15 grid place-items-center mb-3">
                      <ShieldCheck className="h-5 w-5 text-green-500" />
                    </div>
                    <p className="text-[10px] font-bold uppercase tracking-[.16em] text-green-400">SkyGrid fieldwork</p>
                    <h3 className="mt-2 text-xl font-black uppercase">{title as string}</h3>
                    <p className="mt-2 text-sm text-gray-300">
                      Clear routes, aircraft health, and proof of coverage in one mission record.
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="py-20">
          <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:px-8 lg:grid-cols-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-[.2em] text-green-400">Ready when your site is</p>
              <h2 className="mt-3 text-4xl font-black uppercase leading-none tracking-tight">
                Bring every field mission into focus.
              </h2>
              <p className="mt-5 max-w-md leading-relaxed text-gray-300">
                Create your organization, assign a fleet, and start planning the next survey in minutes.
              </p>
            </div>
            <div className="rounded-lg border border-gray-700 bg-gray-800/50 backdrop-blur-sm p-6 shadow-lg">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-lg bg-green-600 text-white">
                  <Mail className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="font-bold text-white">Talk to the mission team</h3>
                  <p className="text-sm text-gray-400">We&apos;ll help you set up your first operational workspace.</p>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/signup" className="rounded-full bg-green-600 px-5 py-3 text-sm font-extrabold text-white hover:bg-green-700">
                  Create workspace
                </Link>
                <a href="mailto:ops@skygrid.example" className="rounded-full border border-gray-600 px-5 py-3 text-sm font-bold hover:bg-white/10">
                  Email operations
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="border-t border-gray-800 py-8">
          <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 sm:px-6 lg:px-8 text-xs text-gray-400 sm:flex-row sm:items-center sm:justify-between">
            <span className="font-bold tracking-[.18em] text-gray-300">SKYGRID AERIAL INTELLIGENCE</span>
            <span>Mission planning · Live operations · Survey insight</span>
            <span>by Samriddhi</span>
            <span className="hidden">
              Made with <span className="inline-block text-red-500 animate-pulse">❤</span> by SkyGrid
            </span>
          </div>
        </footer>
      </div>
    </main>
  );
}
