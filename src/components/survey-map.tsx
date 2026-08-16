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
import { LngLatBounds, type StyleSpecification } from "maplibre-gl";
import { GeoPoint } from "@/lib/simulation/geometry";

const DARK_STYLE = {
  version: 8 as const,
  sources: {
    "carto-dark": {
      type: "raster" as const,
      tiles: ["https://basemaps.cartocdn.com/dark_all/{z}/{x}/{y}@2x.png"],
      tileSize: 256,
      attribution: "© OpenStreetMap contributors © CARTO",
      maxzoom: 20,
    },
  },
  layers: [
    {
      id: "carto-dark",
      type: "raster" as const,
      source: "carto-dark",
      minzoom: 0,
      maxzoom: 20,
      paint: { "raster-saturation": -0.25, "raster-brightness-low": 0.85, "raster-brightness-high": 1.1 },
    },
  ],
} as StyleSpecification;

export interface FlightPath {
  lat: number;
  lng: number;
  alt?: number;
}

export interface MapViewProps {
  areaPolygon?: GeoPoint[];
  flightPath?: FlightPath[];
  flownPath?: FlightPath[];
  currentPosition?: GeoPoint & { heading?: number };
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
  const [vertices, setVertices] = useState<GeoPoint[]>([]);

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
    return { lat: 37.7749, lng: -122.4194, zoom: 11 };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitOnDataKey]);

  const fitBounds = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const pts: (GeoPoint | undefined)[] = [...(areaPolygon ?? []), ...(flightPath ?? []), ...(flownPath ?? [])];
    const real = pts.filter((p): p is GeoPoint => Boolean(p && Number.isFinite(p.lat)));
    if (real.length >= 2) {
      const bounds = new LngLatBounds();
      real.forEach((p) => bounds.extend([p.lng, p.lat]));
      map.fitBounds(bounds, { padding: 48, maxZoom: 17, duration: 700 });
    } else if (real.length === 1) {
      map.easeTo({ center: [real[0].lng, real[0].lat], zoom: 15, duration: 700 });
    } else if (currentPosition) {
      map.easeTo({ center: [currentPosition.lng, currentPosition.lat], zoom: 15, duration: 700 });
    }
  }, [areaPolygon, flightPath, flownPath, currentPosition]);

  useEffect(() => {
    if (fitOnDataKey) {
      const t = setTimeout(fitBounds, 250);
      return () => clearTimeout(t);
    }
  }, [fitOnDataKey, fitBounds]);

  // manual click-to-draw when in drawing mode
  const onMapClick = useCallback(
    (e: { lngLat: { lng: number; lat: number } }) => {
      if (!drawing || !onDrawPolygon) return;
      const { lng, lat } = e.lngLat;
      setVertices((prev) => {
        const next = [...prev, { lng, lat }];
        onDrawPolygon(next);
        return next;
      });
    },
    [drawing, onDrawPolygon],
  );

  const handleDblClick = useCallback(
    (e: { preventDefault: () => void }) => {
      if (!drawing || !onDrawPolygon) return;
      e.preventDefault();
      setVertices((prev) => {
        if (prev.length) {
          onDrawPolygon([...prev, prev[0]]);
          return [];
        }
        return prev;
      });
    },
    [drawing, onDrawPolygon],
  );

  return (
    <Map
      ref={mapRef}
      mapStyle={DARK_STYLE}
      attributionControl={{ compact: true }}
      reuseMaps
      initialViewState={initialView}
      interactive={interactive}
      onClick={onMapClick}
      onDblClick={handleDblClick}
      doubleClickZoom={!drawing}
      style={{ width: "100%", height: "100%" }}
      className={className}
      cursor={drawing ? "crosshair" : "grab"}
      mapLib={import("maplibre-gl") as any}
    >
      <NavigationControl position="bottom-right" showCompass />
      <ScaleControl position="bottom-left" />
      {interactive && <GeolocateControl position="bottom-right" />}

      {home && (
        <Marker longitude={home.lng} latitude={home.lat} anchor="bottom">
          <div className="flex flex-col items-center">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-400 border border-indigo-200/50 shadow" />
            <span className="text-[9px] text-indigo-200/70 tracking-wide mt-0.5">{home.label ?? "HOME"}</span>
          </div>
        </Marker>
      )}

      {fleetMarkers?.map((d) => (
        <Marker key={d.id} longitude={d.lng} latitude={d.lat} anchor="center">
          <div className="pointer-events-none flex flex-col items-center">
            <div className="w-3.5 h-3.5 rounded-full border-2" style={{ borderColor: d.color ?? "#818cf8", background: (d.color ?? "#818cf8") + "33" }} />
            {d.label && (
              <span className="mt-1 mono text-[9px] px-1.5 py-px rounded bg-black/60 text-indigo-200 tracking-wide">
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
            paint={{ "fill-color": "#22d3ee", "fill-opacity": 0.12 }}
          />
          <Layer
            id="area-line"
            type="line"
            paint={{
              "line-color": "#22d3ee",
              "line-width": 2,
              "line-dasharray": [4, 3],
              "line-opacity": 0.9,
            }}
          />
          {vertices.length > 0 && onDrawPolygon && (
            <>
              <Layer
                id="draw-verts"
                type="circle"
                paint={{ "circle-color": "#22d3ee", "circle-radius": 5, "circle-stroke-color": "#ffffff", "circle-stroke-width": 1 }}
              />
              {/* pass-through: we manage vertices via markers below */}
            </>
          )}
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
            paint={{ "line-color": "#22d3ee", "line-opacity": 0.28, "line-width": 6, "line-blur": 6 }}
          />
          <Layer
            id="flown-line"
            type="line"
            paint={{ "line-color": "#67e8f9", "line-width": 2.5, "line-opacity": 0.95 }}
          />
        </Source>
      )}

      {currentPosition && (
        <Marker longitude={currentPosition.lng} latitude={currentPosition.lat} anchor="center">
          <DroneIcon heading={currentPosition.heading ?? 0} color={droneMarker?.color ?? "#22d3ee"} label={droneMarker?.label} />
        </Marker>
      )}

      {children}

      {/* drawing vertices as markers (stable, no source needed) */}
      {drawing &&
        vertices.map((v, i) => (
          <Marker key={i} longitude={v.lng} latitude={v.lat} anchor="center">
            <div className="w-3.5 h-3.5 rounded-full bg-cyan-300 border-2 border-white/80 opacity-80" />
          </Marker>
        ))}
    </Map>
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
          className="mt-0.5 mono text-[9px] px-1.5 py-px rounded bg-black/60 text-cyan-200 tracking-wide"
          style={{ transform: `rotate(${-heading}deg)`, pointerEvents: "none" }}
        >
          {label}
        </div>
      )}
    </div>
  );
}