"use client";

import "leaflet/dist/leaflet.css";
import { CircleMarker, MapContainer, Polyline, TileLayer, Tooltip } from "react-leaflet";
import type { LatLngBoundsExpression } from "leaflet";
import type { MapData } from "@/lib/mapData";

// Fixed hex (not the --brand CSS var) since Leaflet writes these straight
// onto SVG presentation attributes it creates itself, outside where a
// custom-property cascade is guaranteed to apply.
const STOP_COLOR = "#0f7a4f";
const ROUTE_COLOR = "#0f7a4f";

export function RouteMap({ data }: { data: MapData }) {
  if (data.stops.length === 0) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Für keine deiner Haltestellen konnte ein Standort gefunden werden.
      </p>
    );
  }

  const maxVisits = Math.max(...data.stops.map((s) => s.visits));
  const maxCount = Math.max(...data.connections.map((c) => c.count), 1);

  const single = data.stops.length === 1;
  const bounds: LatLngBoundsExpression = data.stops.map((s) => [s.lat, s.lon]);

  return (
    <div>
      <div
        className="overflow-hidden rounded-xl"
        style={{ height: 420, border: "1px solid var(--border)" }}
      >
        <MapContainer
          {...(single
            ? { center: [data.stops[0].lat, data.stops[0].lon] as [number, number], zoom: 13 }
            : { bounds, boundsOptions: { padding: [28, 28] } })}
          scrollWheelZoom={false}
          style={{ height: "100%", width: "100%" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>-Mitwirkende'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {data.connections.map((c) => (
            <Polyline
              key={c.key}
              positions={[
                [c.from.lat, c.from.lon],
                [c.to.lat, c.to.lon],
              ]}
              color={ROUTE_COLOR}
              weight={1.5 + (c.count / maxCount) * 3.5}
              opacity={0.35 + (c.count / maxCount) * 0.35}
              dashArray="1 7"
              lineCap="round"
            >
              <Tooltip sticky>
                {c.from.name} ↔ {c.to.name}
                <br />
                {c.count} {c.count === 1 ? "Fahrt" : "Fahrten"} · ≈{c.distanceKm.toFixed(1)} km
                Luftlinie
              </Tooltip>
            </Polyline>
          ))}
          {data.stops.map((stop) => (
            <CircleMarker
              key={stop.name}
              center={[stop.lat, stop.lon]}
              radius={5 + (stop.visits / maxVisits) * 11}
              color="#ffffff"
              weight={1.5}
              fillColor={STOP_COLOR}
              fillOpacity={0.85}
            >
              <Tooltip sticky>
                <strong>{stop.name}</strong>
                <br />
                {stop.visits}× genutzt
              </Tooltip>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
      <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
        Verbindungen als Luftlinie dargestellt, nicht die tatsächliche Streckenführung.
        {data.unresolvedStopCount > 0
          ? ` ${data.unresolvedStopCount} Haltestelle${data.unresolvedStopCount === 1 ? "" : "n"} konnte${data.unresolvedStopCount === 1 ? "" : "n"} nicht zugeordnet werden.`
          : ""}
      </p>
    </div>
  );
}
