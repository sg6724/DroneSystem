// ============================================================================
// geometry.ts — geodesic helpers for survey planning & simulation
// All math is pure / dependency-free.
// ============================================================================

export interface Point {
  lat: number;
  lng: number;
}

/** Alias used by UI components. */
export type GeoPoint = Point;

export interface Waypoint extends Point {
  alt: number;
  speed: number;
  index: number;
}

export const EARTH_RADIUS_M = 6371008.8;
export const R2D = 180 / Math.PI;
export const D2R = Math.PI / 180;

/** Great-circle (haversine) distance in meters between two points. */
export function haversine(a: Point, b: Point): number {
  const dLat = (b.lat - a.lat) * D2R;
  const dLng = (b.lng - a.lng) * D2R;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * D2R) * Math.cos(b.lat * D2R) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

// ---------------------------------------------------------------------------
// Memoized polyline distance math. Cumulative distances are a pure function of
// the points array and are recomputed on every 1 Hz telemetry poll — memoizing
// by array identity keeps that path single-pass instead of 3-4 passes.
// ---------------------------------------------------------------------------

const cumCache = new WeakMap<Point[], { cum: number[]; total: number }>();

/** Cumulated distance (m) at each vertex, plus overall length. */
export function cumulativeDistances(points: Point[]): { cum: number[]; total: number } {
  const hit = cumCache.get(points);
  if (hit) return hit;
  const cum: number[] = [0];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    total += haversine(points[i - 1], points[i]);
    cum.push(total);
  }
  const out = { cum, total };
  if (points.length <= 20_000) cumCache.set(points, out);
  return out;
}

/** Total geodesic distance in meters along a polyline. */
export function pathDistance(points: Point[]): number {
  return cumulativeDistances(points).total;
}

/** Locate the point at distance d (m) along a polyline, reusing a precomputed cumulative table. */
export function pointAtDistanceWithCum(points: Point[], d: number, dist: { cum: number[]; total: number }): Point {
  const { cum, total } = dist;
  if (d <= 0) return points[0];
  if (d >= total) return points[points.length - 1];
  for (let i = 1; i < points.length; i++) {
    if (d <= cum[i]) {
      const segLen = cum[i] - cum[i - 1] || 1e-9;
      const t = (d - cum[i - 1]) / segLen;
      return slerp(points[i - 1], points[i], t);
    }
  }
  return points[points.length - 1];
}

/**
 * Spherical linear interpolation along a great-circle arc.
 * t in [0,1] across the arc between a and b.
 */
export function slerp(a: Point, b: Point, t: number): Point {
  const φ1 = a.lat * D2R, λ1 = a.lng * D2R;
  const φ2 = b.lat * D2R, λ2 = b.lng * D2R;
  const d = 2 * Math.asin(
    Math.sqrt(
      Math.sin((φ2 - φ1) / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin((λ2 - λ1) / 2) ** 2,
    ),
  );
  if (d < 1e-9) {
    return toStableCoords(t < 0.5 ? a : b);
  }
  const A = Math.sin((1 - t) * d) / Math.sin(d);
  const B = Math.sin(t * d) / Math.sin(d);
  const x = A * Math.cos(φ1) * Math.cos(λ1) + B * Math.cos(φ2) * Math.cos(λ2);
  const y = A * Math.cos(φ1) * Math.sin(λ1) + B * Math.cos(φ2) * Math.sin(λ2);
  const z = A * Math.sin(φ1) + B * Math.sin(φ2);
  const lat = Math.atan2(z, Math.sqrt(x * x + y * y)) * R2D;
  const lng = Math.atan2(y, x) * R2D;
  return { lat, lng };
}

function toStableCoords(p: Point): Point {
  const lat = Math.abs(p.lat) < 1e-11 ? 0 : p.lat;
  const lng = Math.abs(p.lng) < 1e-11 ? 0 : p.lng;
  return { lat, lng };
}

/** Locate the point at distance d (m) along a polyline. */
export function pointAtDistance(points: Point[], d: number): Point {
  if (d <= 0) return points[0];
  const dist = cumulativeDistances(points);
  if (d >= dist.total) return points[points.length - 1];
  return pointAtDistanceWithCum(points, d, dist);
}

/** Approximate planar area (hectares) of a polygon using cylindrical equal-area. */
export function polygonAreaHa(points: Point[]): number {
  if (points.length < 3) return 0;
  const cLat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const scale = Math.cos(cLat * D2R);
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const a = points[i], b = points[(i + 1) % points.length];
    area += (b.lng - a.lng) * scale * (b.lat + a.lat);
  }
  area = Math.abs(area) / 2;
  // degrees^2 -> m^2
  const m2 = area * (111320 * 111320);
  return m2 / 10000;
}

/** Polygon centroid (simple average — fine for survey areas). */
export function centroid(points: Point[]): Point {
  const lat = points.reduce((s, p) => s + p.lat, 0) / points.length;
  const lng = points.reduce((s, p) => s + p.lng, 0) / points.length;
  return { lat, lng };
}

/** Approximate geodesic meters-per-degree-latitude used for local grid math. */
export function metersPerDeg(cLat: number): { mPerLat: number; mPerLng: number } {
  const mPerLat = 111320;
  const mPerLng = 111320 * Math.cos(cLat * D2R);
  return { mPerLat, mPerLng };
}

/**
 * Total flight distance when a survey is flown as a "snake" with the given
 * swath spacing (m). pruned = distance per pass (diagonal compensation ignored).
 * Returns perimeter distance + number of passes.
 */
export function estimateSwathDistance(
  bbox: { minLat: number; maxLat: number; minLng: number; maxLng: number },
  swathM: number,
  orientation: "lat" | "lng",
): { passes: number; distanceM: number } {
  const wDeg = orientation === "lat" ? bbox.maxLat - bbox.minLat : bbox.maxLng - bbox.minLng;
  const hDeg = orientation === "lat" ? bbox.maxLng - bbox.minLng : bbox.maxLat - bbox.minLat;
  const cLat = (bbox.minLat + bbox.maxLat) / 2;
  const { mPerLat, mPerLng } = metersPerDeg(cLat);
  const hM = hDeg * (orientation === "lat" ? mPerLng : mPerLat);
  const passes = Math.max(1, Math.round(hM / swathM));
  return { passes, distanceM: passes * (wDeg * (orientation === "lat" ? mPerLat : mPerLng)) };
}

export function inPolygon(point: Point, poly: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].lng, yi = poly[i].lat;
    const xj = poly[j].lng, yj = poly[j].lat;
    const intersect =
      yi > point.lat !== yj > point.lat &&
      point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}