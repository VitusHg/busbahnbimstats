"use client";

import {
  Bar,
  BarChart,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ModeShareEntry } from "@/lib/stats";
import { VEHICLE_COLOR_VAR, VEHICLE_LABEL_DE, axisTickStyle, tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from "@/lib/chartTheme";
import { formatDurationMin } from "@/lib/textUtils";

export function ModeShareChart({ data }: { data: ModeShareEntry[] }) {
  const rows = data.map((entry) => ({
    name: VEHICLE_LABEL_DE[entry.kind],
    kind: entry.kind,
    legCount: entry.legCount,
    minutes: entry.minutes,
  }));

  if (rows.length === 0) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>Keine Daten.</p>;
  }

  const height = Math.max(140, rows.length * 44);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 32, bottom: 4, left: 4 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="name"
          width={100}
          tickLine={false}
          axisLine={false}
          tick={axisTickStyle}
        />
        <Tooltip
          cursor={{ fill: "var(--surface-2)" }}
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          formatter={(value, _name, item) => {
            const minutes = (item?.payload as { minutes?: number } | undefined)?.minutes ?? 0;
            return [`${value ?? 0} Fahrten · ${formatDurationMin(minutes)}`, ""];
          }}
        />
        <Bar dataKey="legCount" radius={[0, 4, 4, 0]} maxBarSize={24}>
          {rows.map((row) => (
            <Cell key={row.kind} fill={VEHICLE_COLOR_VAR[row.kind]} />
          ))}
          <LabelList
            dataKey="legCount"
            position="right"
            style={{ fill: "var(--text-secondary)", fontSize: 12, fontWeight: 600 }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
