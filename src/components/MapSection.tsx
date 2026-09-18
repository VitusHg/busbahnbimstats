"use client";

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import type { TripDTO } from "@/lib/dto";
import { buildMapData, type MapData } from "@/lib/mapData";
import { CO2_CAR_G_PER_KM, CO2_TRANSIT_G_PER_KM, estimateCo2SavedGrams, type GeoPoint } from "@/lib/distance";
import { normalizeStopName } from "@/lib/textUtils";
import { ChartCard } from "./ChartCard";
import { StatTile } from "./StatTile";

function MapPlaceholder({ label }: { label: string }) {
  return (
    <div
      className="flex h-[420px] items-center justify-center rounded-xl text-sm"
      style={{ background: "var(--surface-2)", color: "var(--text-muted)" }}
    >
      {label}
    </div>
  );
}

const RouteMap = dynamic(() => import("./RouteMap").then((m) => m.RouteMap), {
  ssr: false,
  loading: () => <MapPlaceholder label="Karte wird geladen…" />,
});

type Status = "loading" | "done" | "error";

const MAP_CARD_SUBTITLE =
  "Haltestellen und Verbindungen auf der Karte (OpenStreetMap) - Standorte automatisch anhand des Namens gesucht, daher nicht immer exakt";

export function MapSection({ trips }: { trips: TripDTO[] }) {
  const uniqueStops = useMemo(() => {
    const stops = new Set<string>();
    for (const trip of trips) {
      for (const leg of trip.legs) {
        stops.add(normalizeStopName(leg.departureStop));
        stops.add(normalizeStopName(leg.arrivalStop));
      }
    }
    return stops;
  }, [trips]);

  const [points, setPoints] = useState<Record<string, GeoPoint | null> | null>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    if (uniqueStops.size === 0) return;

    let cancelled = false;
    // Resets a stale "done"/"error" from a previous trips load before the
    // new fetch starts below - without it, old map/CO2 numbers would flash
    // for a moment instead of the loading placeholder.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setStatus("loading");
    fetch("/api/geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stops: [...uniqueStops] }),
    })
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("geocode failed"))))
      .then((body: { points: Record<string, GeoPoint | null> }) => {
        if (cancelled) return;
        setPoints(body.points);
        setStatus("done");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });

    return () => {
      cancelled = true;
    };
  }, [uniqueStops]);

  if (uniqueStops.size === 0) {
    return (
      <ChartCard title="Deine Strecken" subtitle={MAP_CARD_SUBTITLE}>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Keine Haltestellen zum Anzeigen.
        </p>
      </ChartCard>
    );
  }

  const mapData: MapData | null = points ? buildMapData(trips, points) : null;
  const co2SavedKg = mapData ? estimateCo2SavedGrams(mapData.totalDistanceKm) / 1000 : 0;

  return (
    <ChartCard title="Deine Strecken" subtitle={MAP_CARD_SUBTITLE}>
      {status === "loading" ? (
        <MapPlaceholder label="Standorte werden gesucht… (kann bei vielen Haltestellen etwas dauern)" />
      ) : status === "error" || !mapData ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Karte konnte nicht geladen werden.
        </p>
      ) : (
        <>
          <RouteMap data={mapData} />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-2">
            <StatTile
              label="Geschätzte Strecke"
              value={`${mapData.totalDistanceKm.toFixed(0)} km`}
              sub="Luftlinie, Summe aller Etappen"
            />
            <StatTile
              label="CO₂ gespart ggü. Auto"
              value={`${co2SavedKg.toFixed(0)} kg`}
              sub="grobe Schätzung, siehe unten"
              accent
            />
          </div>
          <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
            CO₂-Schätzung: {CO2_CAR_G_PER_KM} g/Pkm für PKW vs. ca. {CO2_TRANSIT_G_PER_KM} g/Pkm für
            öffentlichen Verkehr (Österreich-Durchschnitt, Quelle: VCÖ). Da die tatsächlich
            gefahrene Strecke fast immer länger ist als die Luftlinie, ist diese Schätzung eher
            konservativ.
          </p>
        </>
      )}
    </ChartCard>
  );
}
