import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 0) return "—";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.round(seconds % 60);
  if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
  if (m > 0) return `${m}m ${s.toString().padStart(2, "0")}s`;
  return `${s}s`;
}

export function formatKm(km: number | null | undefined, digits = 1): string {
  if (km === null || km === undefined) return "—";
  return `${km.toFixed(digits)} km`;
}

export function formatEta(ms?: number): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

export function formatWhen(iso?: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function timeAgo(iso?: string | null): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5) return "just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function statusColor(status: string): string {
  switch (status) {
    case "available":
    case "resumed":
    case "completed":
      return "text-emerald-400";
    case "in_mission":
    case "starting":
      return "text-cyan-400";
    case "paused":
    case "charging":
    case "planned":
      return "text-amber-400";
    case "aborted":
    case "maintenance":
    case "offline":
      return "text-red-400";
    default:
      return "text-slate-400";
  }
}

export function statusLabel(status: string): string {
  switch (status) {
    case "available": return "Available";
    case "in_mission": return "In Mission";
    case "in_progress": return "In Progress";
    case "starting": return "Launching";
    case "charging": return "Charging";
    case "maintenance": return "Maintenance";
    case "offline": return "Offline";
    case "planned": return "Planned";
    case "paused": return "Paused";
    case "completed": return "Completed";
    case "aborted": return "Aborted";
    default: return status.replace(/_/g, " ");
  }
}