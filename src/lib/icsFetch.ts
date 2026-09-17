import dns from "node:dns/promises";
import net from "node:net";

export class IcsFetchError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.code = code;
  }
}

const MAX_BYTES = 15 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;

function normalizeUrl(input: string): URL {
  let value = input.trim();
  if (value.startsWith("webcal://")) value = `https://${value.slice("webcal://".length)}`;
  else if (value.startsWith("webcals://")) value = `https://${value.slice("webcals://".length)}`;

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new IcsFetchError("Das ist keine gültige URL.", "invalid_url");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new IcsFetchError(
      "Nur http(s):// bzw. webcal://-Links werden unterstützt.",
      "invalid_protocol",
    );
  }
  return url;
}

/** Blocks loopback/private/link-local/reserved ranges to guard against SSRF via a user-supplied URL. */
function isBlockedIp(ip: string): boolean {
  if (net.isIPv4(ip)) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata endpoints
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    if (a >= 224) return true; // multicast / reserved
    return false;
  }
  if (net.isIPv6(ip)) {
    const lower = ip.toLowerCase();
    if (lower === "::1" || lower === "::") return true;
    if (lower.startsWith("fe80:") || lower.startsWith("fc") || lower.startsWith("fd")) return true;
    if (lower.startsWith("::ffff:")) {
      const mapped = lower.slice("::ffff:".length);
      if (net.isIPv4(mapped)) return isBlockedIp(mapped);
    }
    return false;
  }
  return true;
}

async function assertPublicHost(hostname: string): Promise<void> {
  if (net.isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new IcsFetchError("Diese Adresse ist nicht erlaubt.", "blocked_host");
    }
    return;
  }
  let addresses: string[];
  try {
    addresses = (await dns.lookup(hostname, { all: true })).map((r) => r.address);
  } catch {
    throw new IcsFetchError("Der Hostname konnte nicht aufgelöst werden.", "dns_error");
  }
  if (addresses.length === 0 || addresses.some(isBlockedIp)) {
    throw new IcsFetchError("Diese Adresse ist nicht erlaubt.", "blocked_host");
  }
}

/**
 * Fetches an ICS feed server-side (so browser CORS restrictions on the
 * publisher's side, e.g. iCloud CalDAV, don't apply), with basic SSRF
 * hardening since the URL is user-supplied: only http(s)/webcal schemes,
 * DNS-resolved target must not be a private/loopback/link-local address on
 * every hop, redirects are capped and manually re-validated, and the
 * response body is capped in size with a request timeout.
 */
export async function fetchIcsText(inputUrl: string): Promise<string> {
  let url = normalizeUrl(inputUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    await assertPublicHost(url.hostname);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response: Response;
    try {
      response = await fetch(url, {
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "busbahnbimstats/1.0 (+personal transit stats tool)",
          Accept: "text/calendar, text/plain, */*",
        },
      });
    } catch {
      throw new IcsFetchError(
        "Der Kalender konnte nicht abgerufen werden. Ist der Link öffentlich erreichbar?",
        "fetch_failed",
      );
    } finally {
      clearTimeout(timeout);
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      if (!location) {
        throw new IcsFetchError("Ungültige Weiterleitung vom Server.", "bad_redirect");
      }
      url = normalizeUrl(new URL(location, url).toString());
      continue;
    }

    if (!response.ok) {
      throw new IcsFetchError(
        `Der Kalender-Server hat mit Status ${response.status} geantwortet.`,
        "bad_status",
      );
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const text = await response.text();
      if (Buffer.byteLength(text, "utf-8") > MAX_BYTES) {
        throw new IcsFetchError("Die Kalenderdatei ist zu groß.", "too_large");
      }
      return text;
    }

    const chunks: Buffer[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BYTES) {
        throw new IcsFetchError("Die Kalenderdatei ist zu groß.", "too_large");
      }
      chunks.push(Buffer.from(value));
    }
    return Buffer.concat(chunks).toString("utf-8");
  }

  throw new IcsFetchError("Zu viele Weiterleitungen.", "too_many_redirects");
}
