import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import dns from "node:dns/promises";

vi.mock("node:dns/promises", () => ({
  default: { lookup: vi.fn() },
  lookup: vi.fn(),
}));

const originalFetch = global.fetch;

beforeEach(() => {
  vi.mocked(dns.lookup).mockReset();
});

afterEach(() => {
  global.fetch = originalFetch;
});

async function importFresh() {
  // fetchIcsText holds no module-level state, but re-importing keeps each
  // test's mocks isolated from import-order effects.
  return import("./icsFetch");
}

describe("fetchIcsText", () => {
  it("rejects a non-http(s) protocol", async () => {
    const { fetchIcsText, IcsFetchError } = await importFresh();
    await expect(fetchIcsText("file:///etc/passwd")).rejects.toThrow(IcsFetchError);
  });

  it("rejects an unparsable URL", async () => {
    const { fetchIcsText } = await importFresh();
    await expect(fetchIcsText("not a url")).rejects.toMatchObject({ code: "invalid_url" });
  });

  it("rewrites webcal:// to https:// before validating and fetching", async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);
    global.fetch = vi.fn().mockResolvedValue(
      new Response("BEGIN:VCALENDAR\nEND:VCALENDAR", { status: 200 }),
    );
    const { fetchIcsText } = await importFresh();

    await fetchIcsText("webcal://example.com/cal.ics");

    expect(global.fetch).toHaveBeenCalledWith(
      expect.objectContaining({ href: "https://example.com/cal.ics" }),
      expect.anything(),
    );
  });

  it.each([
    ["127.0.0.1", "loopback"],
    ["10.1.2.3", "private class A"],
    ["172.16.0.5", "private class B"],
    ["192.168.1.1", "private class C"],
    ["169.254.169.254", "link-local / cloud metadata"],
  ])("blocks a hostname resolving to %s (%s)", async (ip) => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: ip, family: 4 }] as never);
    global.fetch = vi.fn();
    const { fetchIcsText, IcsFetchError } = await importFresh();

    await expect(fetchIcsText("https://internal.example.com/cal.ics")).rejects.toThrow(
      IcsFetchError,
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("blocks a literal loopback IP given directly as the host", async () => {
    global.fetch = vi.fn();
    const { fetchIcsText } = await importFresh();

    await expect(fetchIcsText("http://127.0.0.1:8080/cal.ics")).rejects.toMatchObject({
      code: "blocked_host",
    });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(dns.lookup).not.toHaveBeenCalled();
  });

  it("allows a public IP and returns the response body as text", async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);
    global.fetch = vi.fn().mockResolvedValue(
      new Response("BEGIN:VCALENDAR\nEND:VCALENDAR", { status: 200 }),
    );
    const { fetchIcsText } = await importFresh();

    const text = await fetchIcsText("https://example.com/cal.ics");
    expect(text).toBe("BEGIN:VCALENDAR\nEND:VCALENDAR");
  });

  it("surfaces a non-2xx response as a friendly error instead of throwing raw", async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);
    global.fetch = vi.fn().mockResolvedValue(new Response("nope", { status: 404 }));
    const { fetchIcsText } = await importFresh();

    await expect(fetchIcsText("https://example.com/missing.ics")).rejects.toMatchObject({
      code: "bad_status",
    });
  });

  it("re-validates the host on each redirect hop and blocks a redirect into a private range", async () => {
    vi.mocked(dns.lookup).mockResolvedValue([{ address: "93.184.216.34", family: 4 }] as never);
    global.fetch = vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: "http://169.254.169.254/latest/meta-data/" },
      }),
    );
    const { fetchIcsText } = await importFresh();

    await expect(fetchIcsText("https://example.com/redirect")).rejects.toMatchObject({
      code: "blocked_host",
    });
  });
});
