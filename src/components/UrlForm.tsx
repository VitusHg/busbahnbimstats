"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "busbahnbimstats:icsUrl";

function readStoredUrl(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeStoredUrl(url: string) {
  try {
    if (url) localStorage.setItem(STORAGE_KEY, url);
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Private browsing / blocked storage - the form still works, just won't remember.
  }
}

export function UrlForm({
  onSubmit,
  loading,
}: {
  onSubmit: (url: string) => void;
  loading: boolean;
}) {
  // Starts empty (not read from localStorage) so the very first client render
  // matches the server-rendered HTML - localStorage doesn't exist during SSR,
  // so reading it here would make hydration see two different values and
  // fail. The stored URL is instead loaded client-side after mount below.
  const [url, setUrl] = useState("");
  const autoSubmitted = useRef(false);

  useEffect(() => {
    const stored = readStoredUrl();
    if (stored && !autoSubmitted.current) {
      autoSubmitted.current = true;
      setUrl(stored);
      onSubmit(stored);
    }
    // Only ever run once on mount - onSubmit identity may change per render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = url.trim();
    if (!trimmed) return;
    writeStoredUrl(trimmed);
    onSubmit(trimmed);
  }

  function handleClear() {
    setUrl("");
    writeStoredUrl("");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
      <input
        type="text"
        inputMode="url"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        value={url}
        onChange={(event) => setUrl(event.target.value)}
        placeholder="webcal://... oder https://.../published/2/..."
        className="flex-1 rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2"
        style={{
          background: "var(--surface-1)",
          borderColor: "var(--border)",
          color: "var(--text-primary)",
        }}
      />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading || !url.trim()}
          className="rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: "var(--series-1)" }}
        >
          {loading ? "Lädt…" : "Statistik laden"}
        </button>
        {url ? (
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg px-3 py-2 text-sm border cursor-pointer"
            style={{ color: "var(--text-secondary)", borderColor: "var(--border)" }}
          >
            Löschen
          </button>
        ) : null}
      </div>
    </form>
  );
}
