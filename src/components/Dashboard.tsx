import type { TripDTO, StatsDTO } from "@/lib/dto";
import type { ParseDiagnostics } from "@/lib/types";
import { ChartCard } from "./ChartCard";
import { StatTile } from "./StatTile";
import { ModeShareChart } from "./ModeShareChart";
import { TopLinesChart } from "./TopLinesChart";
import { TripsOverTimeChart } from "./TripsOverTimeChart";
import { WeekdayHourHeatmap } from "./WeekdayHourHeatmap";
import { RankBarList } from "./RankBarList";
import { TripList } from "./TripList";
import { formatDurationMin } from "@/lib/textUtils";

export interface TripsResponse {
  trips: TripDTO[];
  stats: StatsDTO;
  diagnostics: ParseDiagnostics;
}

export function Dashboard({ data }: { data: TripsResponse }) {
  const { trips, stats, diagnostics } = data;

  if (stats.totals.trips === 0) {
    return (
      <div
        className="rounded-xl border p-6 text-sm"
        style={{ borderColor: "var(--border)", color: "var(--text-secondary)" }}
      >
        In diesem Kalender wurden keine BusBahnBim-Verbindungen gefunden
        ({diagnostics.totalEvents} Termine geprüft). Ist das der richtige Link?
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {diagnostics.unrecognizedEvents > 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {diagnostics.recognizedEvents} von {diagnostics.totalEvents} Kalendereinträgen als
          BusBahnBim-Fahrten erkannt · {diagnostics.unrecognizedEvents} übersprungen (kein
          passendes Format).
        </p>
      ) : null}

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <StatTile label="Fahrten" value={String(stats.totals.trips)} />
        <StatTile label="Etappen" value={String(stats.totals.legs)} />
        <StatTile
          label="Unterwegs"
          value={formatDurationMin(stats.totals.transitMinutes)}
          sub={`Ø ${formatDurationMin(stats.averages.tripDurationMin)}/Fahrt`}
        />
        <StatTile
          label="Umstiegszeit"
          value={formatDurationMin(stats.totals.transferMinutes)}
        />
        <StatTile label="Haltestellen" value={String(stats.totals.distinctStops)} />
        <StatTile
          label="Längste Serie"
          value={`${stats.longestStreakDays} Tage`}
          sub="in Folge unterwegs"
        />
      </div>

      <ChartCard title="Fahrten im Zeitverlauf" subtitle="Anzahl Fahrten pro Tag">
        <TripsOverTimeChart data={stats.overTime} />
      </ChartCard>

      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard title="Verkehrsmittel" subtitle="Etappen nach Fahrzeugtyp">
          <ModeShareChart data={stats.modeShare} />
        </ChartCard>
        <ChartCard title="Meistgenutzte Linien">
          <TopLinesChart data={stats.topLines} />
        </ChartCard>
      </div>

      <ChartCard title="Wann bist du unterwegs?" subtitle="Fahrten nach Wochentag und Uhrzeit (lokale Zeit)">
        <WeekdayHourHeatmap data={stats.heatmap} />
      </ChartCard>

      <div className="grid md:grid-cols-2 gap-6">
        <ChartCard title="Meistgenutzte Haltestellen">
          <RankBarList
            items={stats.topStops.map((s) => ({
              key: s.stop,
              primary: s.stop,
              value: s.total,
              valueLabel: String(s.total),
            }))}
          />
        </ChartCard>
        <ChartCard title="Häufigste Strecken">
          <RankBarList
            items={stats.topRoutes.map((r) => ({
              key: `${r.origin}->${r.destination}`,
              primary: r.origin,
              secondary: `→ ${r.destination}`,
              value: r.count,
              valueLabel: String(r.count),
            }))}
          />
        </ChartCard>
      </div>

      <div className="grid sm:grid-cols-2 gap-6">
        {stats.longestTrip ? (
          <ChartCard title="Längste Fahrt">
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>
              {stats.longestTrip.originLabel} → {stats.longestTrip.destinationLabel}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {stats.longestTrip.startDateLocal} · {formatDurationMin(stats.longestTrip.totalDurationMin)}
            </p>
          </ChartCard>
        ) : null}
        {stats.shortestTrip ? (
          <ChartCard title="Kürzeste Fahrt">
            <p className="text-sm" style={{ color: "var(--text-primary)" }}>
              {stats.shortestTrip.originLabel} → {stats.shortestTrip.destinationLabel}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              {stats.shortestTrip.startDateLocal} · {formatDurationMin(stats.shortestTrip.totalDurationMin)}
            </p>
          </ChartCard>
        ) : null}
      </div>

      <ChartCard title="Alle Fahrten" subtitle={`${trips.length} Fahrten, neueste zuerst`}>
        <TripList trips={trips} />
      </ChartCard>
    </div>
  );
}
