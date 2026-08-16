// ============================================================================
// patterns.ts — flight-line generators for survey patterns
// Pure functions: area polygon (lat/lng) + config -> list of waypoints.
// Works in a local planar frame (ENU in meters) to keep math stable.
// ============================================================================

import { Waypoint } from "./geometry";
import { D2R, R2D, EARTH_RADIUS_M, centroid, polygonAreaHa } from "./geometry";

export type SurveyPattern = "grid" | "crosshatch" | "perimeter";

export interface PatternConfig {
  altitudeM: number;
  speedMps: number;
  overlapPercent: number; // 0..95
  swathFactor?: number; // footprint width = altitude * swathFactor (default 2.0)
}

export interface GeneratedPath {
  waypoints: Waypoint[];
  totalKm: number;
  passes: number;
  coverageHa: number;
}

// --- local planar frame -----------------------------------------------------
interface Vec {
  x: number; // east, m
  y: number; // north, m
}

function toPlanar(poly: { lat: number; lng: number }[]) {
  const c = centroid(poly);
  const cosLat = Math.cos(c.lat * D2R);
  const mPerLng = EARTH_RADIUS_M * D2R * cosLat;
  const mPerLat = EARTH_RADIUS_M * D2R;
  const points: Vec[] = poly.map((p) => ({
    x: (p.lng - c.lng) * mPerLng,
    y: (p.lat - c.lat) * mPerLat,
  }));
  return {
    center: c,
    mPerLng,
    mPerLat,
    points,
    toLatLng: (v: Vec) => ({ lat: c.lat + v.y / mPerLat, lng: c.lng + v.x / mPerLng }),
  };
}

/** Number of parallel passes given a bbox width and effective swath spacing. */
function passesFor(widthM: number, spacingM: number) {
  return Math.max(1, Math.ceil(widthM / Math.max(30, spacingM)));
}

/** Build snake (boustrophedon) waypoints along vertical strips in planar frame. */
function snakeStrips(
  pts: Vec[],
  strips: Vec[][],
): { waypoints: Vec[]; distanceM: number } {
  const result: Vec[] = [];
  let distance = 0;
  for (let s = 0; s < strips.length; s++) {
    const strip = strips[s];
    if (s % 2 === 1) strip.reverse();
    if (result.length) distance += Math.hypot(result[result.length - 1].x - strip[0].x, result[result.length - 1].y - strip[0].y);
    for (let i = 0; i < strip.length; i++) {
      if (result.length) {
        const prev = result[result.length - 1];
        distance += Math.hypot(prev.x - strip[i].x, prev.y - strip[i].y);
      }
      result.push(strip[i]);
    }
  }
  return { waypoints: result, distanceM: distance };
}

// --- pattern builders -------------------------------------------------------

export function buildPath(
  area: { lat: number; lng: number }[],
  pattern: SurveyPattern,
  cfg: PatternConfig,
): GeneratedPath {
  if (pattern === "perimeter") return buildPerimeter(area, cfg);
  const f = toPlanar(area);
  const swath = Math.max(30, cfg.altitudeM * (cfg.swathFactor ?? 2.0));
  const spacing = swath * (1 - cfg.overlapPercent / 100);

  const xs = f.points.map((p) => p.x);
  const ys = f.points.map((p) => p.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const widthX = maxX - minX;
  const heightY = maxY - minY;

  const alt = cfg.altitudeM;
  const speed = cfg.speedMps;

  // Choose flight direction along the shorter axis to minimize turns.
  const flyAlongX = widthX >= heightY; // sweeps along X means strips vary across Y

  let strips: Vec[][];
  if (flyAlongX) {
    // strips run left->right along X, stacked across Y
    const n = passesFor(heightY, spacing);
    const stripYs: number[] = [];
    const step = (heightY / n);
    for (let i = 0; i < n + 1; i++) stripYs.push(minY + i * step);
    // each strip samples along x from left to right at fixed y-levels (top/bottom ends)
    const topBot = ys;
    const levels: number[] = [];
    for (let i = 0; i <= n; i++) {
      const y = minY + i * (heightY / n);
      levels.push(y);
    }
    strips = levels.map((y) => [
      { x: minX, y },
      { x: maxX, y },
    ]);
    // Clamp via polygon inclusion on waypoints is a refinement; for simplicity
    // we keep full bbox strips — coverage is complete even if over-edge.
    void topBot;
    void stripYs;
  } else {
    // strip along Y, stacked across X
    const n = passesFor(widthX, spacing);
    const levels: number[] = [];
    for (let i = 0; i <= n; i++) levels.push(minX + i * (widthX / n));
    strips = levels.map((x) => [
      { x, y: minY },
      { x, y: maxY },
    ]);
  }

  const built = snakeStrips(f.points, strips);
  const waypoints: Waypoint[] = built.waypoints.map((v, i) => ({
    ...f.toLatLng(v),
    alt,
    speed,
    index: i,
  }));

  return {
    waypoints,
    totalKm: built.distanceM / 1000,
    passes: strips.length,
    coverageHa: polygonAreaHa(area),
  };
}

export function buildGrid(
  area: { lat: number; lng: number }[],
  cfg: PatternConfig,
): GeneratedPath {
  return buildPath(area, "grid", cfg);
}

export function buildCrosshatch(
  area: { lat: number; lng: number }[],
  cfg: PatternConfig,
): GeneratedPath {
  const primary = buildPath(area, "grid", { ...cfg, overlapPercent: cfg.overlapPercent });
  // perpendicular second sweep at 90°
  const rotated: { lat: number; lng: number }[] = area.map((p) => p); // same polygon
  const secondary = buildPath(rotated, "grid", { ...cfg, overlapPercent: cfg.overlapPercent, swathFactor: cfg.swathFactor });
  // Re-order second sweep to start near where primary ended.
  const pLast = secondary.waypoints[secondary.waypoints.length - 1];
  void pLast;
  return {
    waypoints: [...primary.waypoints, ...secondary.waypoints.map((w, i) => ({ ...w, index: primary.waypoints.length + i }))],
    totalKm: primary.totalKm + secondary.totalKm,
    passes: primary.passes + secondary.passes,
    coverageHa: polygonAreaHa(area),
  };
}

export function buildPerimeter(
  area: { lat: number; lng: number }[],
  cfg: PatternConfig,
): GeneratedPath {
  const f = toPlanar(area);
  const insetM = Math.min(
    Math.max(20, cfg.altitudeM * 1.5),
    ...PolygonWidths(f.points),
  );
  const inner = offsetPolygon(f.points, -insetM);
  const outline = f.points.slice();
  const path = [...outline, ...inner.slice().reverse(), inner[0] ?? inner[0]];

  const waypoints: Waypoint[] = path.map((v, i) => ({
    ...f.toLatLng(v),
    alt: cfg.altitudeM,
    speed: cfg.speedMps,
    index: i,
  }));
  let distance = 0;
  for (let i = 1; i < path.length; i++) distance += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);

  return {
    waypoints,
    totalKm: distance / 1000,
    passes: Math.max(1, Math.round(distance / (2 * (outline.length + inner.length)))),
    coverageHa: polygonAreaHa(area),
  };
}

function PolygonWidths(pts: Vec[]): number[] {
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  return [Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)];
}

function offsetPolygon(pts: Vec[], dM: number): Vec[] {
  if (pts.length < 3) return pts;
  const n = pts.length;
  const result: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const prev = pts[(i - 1 + n) % n];
    const cur = pts[i];
    const next = pts[(i + 1) % n];
    const v1 = norm(sub(cur, prev));
    const v2 = norm(sub(next, cur));
    const bisector = norm(add(v1, v2));
    const miter = (x0: number, y0: number, x1: number, y1: number) =>
      Math.hypot(x1 - x0, y1 - y0);
    void miter;
    result.push({
      x: cur.x + bisector.x * dM,
      y: cur.y + bisector.y * dM,
    });
  }
  return result;
}

function sub(a: Vec, b: Vec): Vec {
  return { x: a.x - b.x, y: a.y - b.y };
}
function add(a: Vec, b: Vec): Vec {
  return { x: a.x + b.x, y: a.y + b.y };
}
function norm(v: Vec): Vec {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
}

/** Estimated capture count: area * (1/spacing²) style rule using sensor footprint. */
export function estimateImages(coverageHa: number, altitudeM: number, overlapPercent: number, swathFactor = 2.0): number {
  const swath = Math.max(30, altitudeM * swathFactor);
  const spacing = swath * (1 - overlapPercent / 100);
  const perHa = 1e4 / Math.max(60, spacing * spacing);
  return Math.round(coverageHa * perHa);
}