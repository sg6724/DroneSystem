import Link from "next/link";
import { Rocket, Activity, Radar, LineChart } from "lucide-react";
import { AuthForm } from "./auth-form";

export default function AuthPage({ mode }: { mode: "login" | "signup" }) {
  return (
    <div className="min-h-full flex flex-col md:flex-row">
      {/* left brand panel */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between p-12 border-r border-gridline/60 bg-ink-900/40 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(600px 300px at 20% 10%, rgba(34,211,238,0.14), transparent 60%), radial-gradient(500px 300px at 90% 90%, rgba(129,140,248,0.12), transparent 60%)",
          }}
        />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-500/25">
            <Rocket className="w-5.5 h-5.5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-bold tracking-wide text-lg">SKYGRID</div>
            <div className="text-[10px] text-slate-400 tracking-[0.25em] uppercase">Survey Operations</div>
          </div>
        </div>

        <div className="relative">
          <h1 className="text-3xl font-bold leading-snug">
            Command your entire
            <br />
            <span className="gradient-text">drone survey fleet.</span>
          </h1>
          <p className="mt-4 text-sm text-slate-400 max-w-md leading-relaxed">
            Plan autonomous missions across global sites, monitor every vehicle in
            real time, and turn captured surveys into actionable intelligence.
          </p>

          <div className="mt-10 space-y-4">
            {[
              { icon: Radar, title: "Mission Control", desc: "Tailored rigs, per-site flight patterns" },
              { icon: LineChart, title: "Live Telemetry", desc: "Position, battery, progress — 1s refresh" },
              { icon: Activity, title: "Org Analytics", desc: "Coverage, throughput, fleet utilization" },
            ].map((f) => (
              <div key={f.title} className="flex items-center gap-4">
                <div className="w-11 h-11 rounded-xl bg-white/5 border border-gridline/60 flex items-center justify-center">
                  <f.icon className="w-5 h-5 text-cyan-300" />
                </div>
                <div>
                  <div className="text-sm font-semibold">{f.title}</div>
                  <div className="text-xs text-slate-500">{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-[11px] text-slate-600 flex gap-6">
          <span>Deterministic flight sim</span>
          <span>Org-isolated via RLS</span>
          <span>Serverless on Vercel</span>
        </div>
      </div>

      {/* right auth panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-2xl font-bold">
              {mode === "login" ? "Welcome back" : "Create your command center"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {mode === "login"
                ? "Sign in to manage your drone operations."
                : "Set up your organization in under a minute."}
            </p>
          </div>

          <AuthForm mode={mode} />

          <p className="mt-6 text-center text-[13px] text-slate-500">
            {mode === "login" ? (
              <>
                New to SkyGrid?{" "}
                <Link href="/signup" className="text-cyan-400 hover:text-cyan-300 font-semibold">
                  Create an account
                </Link>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <Link href="/login" className="text-cyan-400 hover:text-cyan-300 font-semibold">
                  Sign in
                </Link>
              </>
            )}
          </p>

          <div className="mt-10 pt-6 border-t border-gridline/50 text-center lg:hidden">
            <p className="text-xs text-slate-600">
              Deterministic flight sim · Org-isolated data · Serverless on Vercel
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}