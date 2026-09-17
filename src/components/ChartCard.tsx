import type { ReactNode } from "react";

export function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`min-w-0 rounded-xl border p-4 sm:p-5 ${className}`}
      style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
    >
      <header className="mb-3">
        <h3 className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
          {title}
        </h3>
        {subtitle ? (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {subtitle}
          </p>
        ) : null}
      </header>
      {children}
    </section>
  );
}
