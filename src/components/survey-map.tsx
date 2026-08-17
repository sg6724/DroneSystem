"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Map, {
  MapRef,
  NavigationControl,
  ScaleControl,
  Marker,
  GeolocateControl,
  Layer,
  Source,
} from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";
import { LngLatBounds } from "maplibre-gl";
import { GeoPoint } from "@/lib/simulation/geometry";
import { cn } from "@/lib/utils";

// Direct OpenStreetMap raster tiles are the most reliable option for the
// browser environments used by this dashboard.
const BASEMAP_STYLE = {
  version: 8 as const,
  sources: {
    openstreetmap: {
      type: "raster" as const,
      tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors",
      maxzoom: 19,
    },
  },
  layers: [
    {
      id: "openstreetmap",
      type: "raster" as const,
      source: "openstreetmap",
      minzoom: 0,
      maxzoom: 19,
    },
  ],
};

export interface FlightPath {
  lat: number;
  lng: number;
  alt?: number;
}

export interface MapViewProps {
  areaPolygon?: GeoPoint[];
  flightPath?: FlightPath[];
  flownPath?: FlightPath[];
  currentPosition?: { lat: number; lng: number; heading?: number };
  droneMarker?: { label?: string; color?: string };
  home?: GeoPoint & { label?: string };
  onDrawPolygon?: (polygon: GeoPoint[]) => void;
  drawing?: boolean;
  fitOnDataKey?: string;
  children?: React.ReactNode;
  interactive?: boolean;
  className?: string;
  fleetMarkers?: { id: string; lat: number; lng: number; color?: string; label?: string }[];
}

export default function SurveyMap({
  areaPolygon,
  flightPath,
  flownPath,
  currentPosition,
  droneMarker,
  home,
  onDrawPolygon,
  drawing = false,
  fitOnDataKey,
  children,
  interactive = true,
  className,
  fleetMarkers,
}: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [vertices, setVertices] = useState<GeoPoint[]>([]);
  const verticesRef = useRef<GeoPoint[]>([]);

  // initial viewport centered on area or a default world view
  const initialView = useMemo(() => {
    if (areaPolygon && areaPolygon.length) {
      const lats = areaPolygon.map((p) => p.lat);
      const lngs = areaPolygon.map((p) => p.lng);
      const minLat = Math.min(...lats), maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs), maxLng = Math.max(...lngs);
      const lat = (minLat + maxLat) / 2;
      const lng = (minLng + maxLng) / 2;
      const span = Math.max(maxLat - minLat, Math.abs(maxLng - minLng));
      return { lat, lng, zoom: span < 0.01 ? 16 : Math.max(11, 15 - Math.log2(span * 400)) };
    }
    if (currentPosition) return { lat: currentPosition.lat, lng: currentPosition.lng, zoom: 14 };
    const validFleetMarkers = (fleetMarkers ?? []).filter(
      (marker) => Number.isFinite(marker.lat) && Number.isFinite(marker.lng),
    );
    if (validFleetMarkers.length) {
      const lats = validFleetMarkers.map((marker) => marker.lat);
      const lngs = validFleetMarkers.map((marker) => marker.lng);
      const span = Math.max(
        Math.max(...lats) - Math.min(...lats),
        Math.max(...lngs) - Math.min(...lngs),
      );
      return {
        lat: (Math.max(...lats) + Math.min(...lats)) / 2,
        lng: (Math.max(...lngs) + Math.min(...lngs)) / 2,
        zoom: span < 0.01 ? 15 : Math.max(3, Math.min(12, 8 - Math.log2(span))),
      };
    }
    return { lat: 37.7749, lng: -122.4194, zoom: 11 };
  }, [areaPolygon, currentPosition, fleetMarkers]);

  const fitBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const pts: (GeoPoint | undefined)[] = [
      ...(areaPolygon ?? []),
      ...(flightPath ?? []),
      ...(flownPath ?? []),
      ...(fleetMarkers ?? []),
    ];
    const real = pts.filter(
      (p): p is GeoPoint => Boolean(p && Number.isFinite(p.lat) && Number.isFinite(p.lng)),
    );
    if (real.length >= 2) {
      const bounds = new LngLatBounds();
      real.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 48, maxZoom: 17, duration: 700 });
    } else if (real.length === 1) {
      map.easeTo({ center: [real[0].lng, real[0].lat], zoom: 15, duration: 700 });
    } else if (currentPosition) {
      map.easeTo({ center: [currentPosition.lng, currentPosition.lat], zoom: 15, duration: 700 });
    }
  }, [areaPolygon, flightPath, flownPath, currentPosition, fleetMarkers]);

  useEffect(() => {
    if (fitOnDataKey) {
      const t = setTimeout(fitBounds, 250);
      return () => clearTimeout(t);
    }
  }, [fitOnDataKey, fitBounds]);

  // A map can mount before a mobile layout or tab has its final dimensions.
  // Resize it whenever the shared container changes size.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resize = () => mapRef.current?.resize();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    const frame = requestAnimationFrame(resize);

    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);

  // manual click-to-draw when in drawing mode
  const onMapClick = useCallback(
    (e: { lngLat: { lng: number; lat: number } }) => {
      if (!drawing || !onDrawPolygon) return;
      const { lng, lat } = e.lngLat;
      const next = [...verticesRef.current, { lng, lat }];
      verticesRef.current = next;
      setVertices(next);
      onDrawPolygon(next);
    },
    [drawing, onDrawPolygon],
  );

  const handleDblClick = useCallback(
    (e: { preventDefault: () => void }) => {
      if (!drawing || !onDrawPolygon) return;
      e.preventDefault();
      const current = verticesRef.current;
      if (!current.length) return;
      onDrawPolygon([...current, current[0]]);
      verticesRef.current = [];
      setVertices([]);
    },
    [drawing, onDrawPolygon],
  );

  return (
    <div ref={containerRef} className={cn("relative w-full h-full min-h-0 overflow-hidden", className)}>
      <Map
        ref={mapRef}
        mapStyle={BASEMAP_STYLE}
        attributionControl={{ compact: true }}
        initialViewState={initialView}
        interactive={interactive}
        onClick={onMapClick}
        onDblClick={handleDblClick}
        doubleClickZoom={!drawing}
        style={{ width: "100%", height: "100%" }}
        cursor={drawing ? "crosshair" : "grab"}
        // mapLib types are modeled on mapbox-gl; maplibre's namespace needs a cast
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        mapLib={import("maplibre-gl") as any}
        onLoad={() => {
          mapRef.current?.resize();
          fitBounds();
        }}
      >
      <NavigationControl position="bottom-right" showCompass />
      <ScaleControl position="bottom-left" />
      {interactive && <GeolocateControl position="bottom-right" />}

      {home && (
        <Marker longitude={home.lng} latitude={home.lat} anchor="bottom">
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 border border-green-200/50 shadow" />
            <span className="text-[9px] text-green-200/70 tracking-wide mt-0.5">{home.label ?? "HOME"}</span>
          </div>
        </Marker>
      )}

      {fleetMarkers?.map((d) => (
        <Marker key={d.id} longitude={d.lng} latitude={d.lat} anchor="center">
          <div className="pointer-events-none flex flex-col items-center">
            <div className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: d.color ?? "#22c55e", background: (d.color ?? "#22c55e") + "33" }} />
            {d.label && (
              <span className="mt-1 mono text-[9px] px-1.5 py-px rounded bg-black/60 text-green-200 tracking-wide">
                {d.label}
              </span>
            )}
          </div>
        </Marker>
      ))}

      {areaPolygon && areaPolygon.length >= 3 && (
        <Source
          id="area"
          type="geojson"
          data={{
            type: "Feature",
            properties: {},
            geometry: { type: "Polygon", coordinates: [areaPolygon.map((p) => [p.lng, p.lat])] },
          }}
        >
          <Layer
            id="area-fill"
            type="fill"
            paint={{ "fill-color": "#22c55e", "fill-opacity": 0.12 }}
          />
          <Layer
            id="area-line"
            type="line"
            paint={{
              "line-color": "#22c55e",
              "line-width": 2,
              "line-dasharray": [4, 3],
              "line-opacity": 0.9,
            }}
          />
        </Source>
      )}

      {flightPath && flightPath.length > 1 && (
        <Source
          id="path"
          type="geojson"
          data={{
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: flightPath.map((p) => [p.lng, p.lat]) },
          }}
        >
          <Layer
            id="path-line-dim"
            type="line"
            paint={{
              "line-color": "#33506e",
              "line-width": 3,
              "line-opacity": 0.55,
            }}
          />
        </Source>
      )}

      {flownPath && flownPath.length > 1 && (
        <Source
          id="flown"
          type="geojson"
          data={{
            type: "Feature",
            properties: {},
            geometry: { type: "LineString", coordinates: flownPath.map((p) => [p.lng, p.lat]) },
          }}
        >
          <Layer
            id="flown-line-soft"
            type="line"
            paint={{ "line-color": "#22c55e", "line-opacity": 0.28, "line-width": 6, "line-blur": 6 }}
          />
          <Layer
            id="flown-line"
            type="line"
            paint={{ "line-color": "#4ade80", "line-width": 2.5, "line-opacity": 0.95 }}
          />
        </Source>
      )}

      {currentPosition && (
        <Marker longitude={currentPosition.lng} latitude={currentPosition.lat} anchor="center">
          <DroneIcon heading={currentPosition.heading ?? 0} color={droneMarker?.color ?? "#22c55e"} label={droneMarker?.label} />
        </Marker>
      )}

      {children}

      {/* drawing vertices as markers (stable, no source needed) */}
      {drawing &&
        vertices.map((v, i) => (
          <Marker key={i} longitude={v.lng} latitude={v.lat} anchor="center">
            <div className="w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white/80 opacity-80" />
          </Marker>
        ))}
      </Map>
    </div>
  );
}

function DroneIcon({ heading, color, label }: { heading: number; color: string; label?: string }) {
  return (
    <div className="flex flex-col items-center pointer-events-none" style={{ transform: `rotate(${heading}deg)` }}>
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10.5" fill={color} opacity="0.15" />
        <path
          d="M12 2v20M2 12h20M12 2c3.5 3 5 5.5 5 10s-1.5 7-5 10c-3.5-3-5-5.5-5-10s1.5-7 5-10z"
          stroke={color}
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
        <circle cx="12" cy="12" r="2.5" fill="#fff" stroke={color} strokeWidth="1.4" />
      </svg>
      {label && (
        <div
          className="mt-0.5 mono text-[9px] px-1.5 py-px rounded bg-black/60 text-green-200 tracking-wide"
          style={{ transform: `rotate(${-heading}deg)`, pointerEvents: "none" }}
        >
          {label}
        </div>
      )}
    </div>
  );
}
