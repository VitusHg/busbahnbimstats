"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DayCount } from "@/lib/stats";
import { axisTickStyle, tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from "@/lib/chartTheme";

function formatDayLabel(iso: string): string {
  const [, month, day] = iso.split("-");
  return `${day}.${month}.`;
}

export function TripsOverTimeChart({ data }: { data: DayCount[] }) {
  if (data.length === 0) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>Keine Daten.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
        <defs>
          <linearGradient id="tripsOverTimeFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.12} />
            <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--gridline)" vertical={false} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDayLabel}
          tickLine={false}
          axisLine={{ stroke: "var(--baseline)" }}
          tick={axisTickStyle}
          minTickGap={24}
        />
        <YAxis
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
          tick={axisTickStyle}
          width={28}
        />
        <Tooltip
          cursor={{ stroke: "var(--baseline)", strokeWidth: 1 }}
          contentStyle={tooltipContentStyle}
          labelStyle={tooltipLabelStyle}
          itemStyle={tooltipItemStyle}
          labelFormatter={(label) => formatDayLabel(String(label))}
          formatter={(value) => [`${value ?? 0} Fahrten`, ""]}
        />
        <Area
          type="linear"
          dataKey="count"
          stroke="var(--series-1)"
          strokeWidth={2}
          fill="url(#tripsOverTimeFill)"
          activeDot={{ r: 4, strokeWidth: 2, stroke: "var(--surface-1)" }}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
