"use client";

import { useState } from "react";
import { UrlForm } from "@/components/UrlForm";
import { Dashboard, type TripsResponse } from "@/components/Dashboard";

export default function Home() {
  const [data, setData] = useState<TripsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(icsUrl: string) {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icsUrl }),
      });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error ?? "Unbekannter Fehler.");
        return;
      }
      setData(body as TripsResponse);
    } catch {
      setError("Netzwerkfehler beim Abrufen der Statistik.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex-1 mx-auto w-full max-w-5xl px-4 py-8 sm:py-12">
      {!data ? (
        <header className="mb-6">
          <h1
            className="text-2xl sm:text-3xl font-bold tracking-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Wie fährst du wirklich?
          </h1>
          <p className="text-sm sm:text-base mt-2 max-w-2xl" style={{ color: "var(--text-secondary)" }}>
            Trag den öffentlich freigegebenen Kalender-Link deiner BusBahnBim-Fahrten ein (aus
            der Kalender-App: „Kalender abonnieren“ / webcal-Link) und wir machen eine Statistik
            aus deinen Fahrten.
          </p>
        </header>
      ) : null}

      <div
        className="rounded-2xl border p-4 sm:p-5"
        style={{ background: "var(--surface-1)", borderColor: "var(--border)" }}
      >
        <UrlForm onSubmit={handleSubmit} loading={loading} />
        <p className="text-xs mt-2.5" style={{ color: "var(--text-muted)" }}>
          Nichts wird auf einem Server gespeichert — der Link bleibt nur in deinem Browser.
        </p>
      </div>

      {error ? (
        <p
          role="alert"
          className="mt-4 text-sm rounded-lg border px-3 py-2"
          style={{ borderColor: "var(--status-critical)", color: "var(--status-critical)" }}
        >
          {error}
        </p>
      ) : null}

      <div className="mt-8">
        {data ? (
          <Dashboard data={data} />
        ) : !loading ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Noch keine Daten geladen.
          </p>
        ) : null}
      </div>
    </main>
  );
}
