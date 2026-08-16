// ============================================================================
// demo-store.ts — in-memory datastore used when Supabase env keys are absent.
// Mirrors the real Postgres schema so the app is fully demo-able offline.
// ============================================================================

import { drones as seedDrones } from "./demo-seed";
import { Drone, Mission, MissionEvent } from "../types";

export const ORG_ID_DEMO = "00000000-0000-0000-0000-000000000001";

interface DemoState {
  drones: Map<string, Drone>;
  missions: Map<string, Mission>;
  events: MissionEvent[];
}

const seed = (): DemoState => {
  const drones = new Map<string, Drone>();
  seedDrones.forEach((d) => drones.set(d.id, d));
  return { drones, missions: new Map(), events: [] };
};

let store: DemoState | null = null;

export function resetDemoStore() {
  store = null;
}

export function demoStore(): DemoState {
  if (!store) store = seed();
  return store;
}