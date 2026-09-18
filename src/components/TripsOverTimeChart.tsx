"use client";

import { useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DayCount } from "@/lib/stats";
import { aggregateTrend, formatTrendLabel, type TrendGranularity } from "@/lib/insights";
import { axisTickStyle, tooltipContentStyle, tooltipItemStyle, tooltipLabelStyle } from "@/lib/chartTheme";

const OPTIONS: { value: TrendGranularity; label: string }[] = [
  { value: "day", label: "Tag" },
  { value: "week", label: "Woche" },
  { value: "month", label: "Monat" },
];

function defaultGranularity(spanDays: number): TrendGranularity {
  if (spanDays > 200) return "month";
  if (spanDays > 60) return "week";
  return "day";
}

export function TripsOverTimeChart({ data }: { data: DayCount[] }) {
  const [chosen, setChosen] = useState<TrendGranularity | null>(null);

  if (data.length === 0) {
    return <p className="text-sm" style={{ color: "var(--text-muted)" }}>Keine Daten.</p>;
  }

  const granularity = chosen ?? defaultGranularity(data.length);
  const bucketed = aggregateTrend(data, granularity);
  const label = (key: string) => formatTrendLabel(key, granularity);

  return (
    <div>
      <div className="mb-2 flex justify-end gap-1">
        {OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setChosen(opt.value)}
            className="cursor-pointer rounded-md px-2.5 py-1 text-xs transition-colors"
            style={{
              background: granularity === opt.value ? "var(--brand-soft)" : "transparent",
              color: granularity === opt.value ? "var(--brand-soft-text)" : "var(--text-muted)",
              fontWeight: granularity === opt.value ? 600 : 400,
            }}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <AreaChart data={bucketed} margin={{ top: 8, right: 16, bottom: 0, left: -16 }}>
          <defs>
            <linearGradient id="tripsOverTimeFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--series-1)" stopOpacity={0.12} />
              <stop offset="100%" stopColor="var(--series-1)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--gridline)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={label}
            tickLine={false}
            axisLine={{ stroke: "var(--baseline)" }}
            tick={axisTickStyle}
            minTickGap={24}
          />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={axisTickStyle} width={28} />
          <Tooltip
            cursor={{ stroke: "var(--baseline)", strokeWidth: 1 }}
            contentStyle={tooltipContentStyle}
            labelStyle={tooltipLabelStyle}
            itemStyle={tooltipItemStyle}
            labelFormatter={(l) => label(String(l))}
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
    </div>
  );
}
