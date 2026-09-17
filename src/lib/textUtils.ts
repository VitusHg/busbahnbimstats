/**
 * Strips a trailing platform/stand designator such as ", B" or ", F" from a
 * stop name so that "Graz Jakominiplatz, B" and "Graz Jakominiplatz, D" group
 * together as the same physical stop for linking and aggregate stats.
 */
export function normalizeStopName(raw: string): string {
  return raw
    .replace(/,\s*[A-Za-zÄÖÜäöüß0-9]{1,3}$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function formatDurationMin(totalMinutes: number): string {
  const minutes = Math.round(totalMinutes);
  if (minutes < 60) return `${minutes} Min.`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} Std.` : `${h} Std. ${m} Min.`;
}
