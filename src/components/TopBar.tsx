import { VehicleIcon } from "./VehicleIcon";

export function TopBar() {
  return (
    <header
      className="sticky top-0 z-10 border-b backdrop-blur"
      style={{ background: "color-mix(in srgb, var(--surface-1) 92%, transparent)", borderColor: "var(--border)" }}
    >
      <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-4 py-3.5">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
          style={{ background: "var(--brand)" }}
        >
          <VehicleIcon kind="tram" size={20} className="text-white" />
        </span>
        <div className="leading-tight">
          <div className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
            BusBahnBim<span style={{ color: "var(--brand-text)" }}>Stats</span>
          </div>
          <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Deine Öffi-Fahrten im Überblick
          </div>
        </div>
      </div>
    </header>
  );
}
