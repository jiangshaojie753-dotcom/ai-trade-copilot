import { describe, expect, it, vi } from "vitest";
import { TtlCache } from "./cache";
import {
  BraveSearchProvider,
  createRealSearchProvider,
  RealSearchProvider,
  type SearchBackend,
} from "./real-search-provider";
import type { SearchResult } from "./providers";

const realResult: SearchResult = {
  id: "1", title: "Apex Logistics", url: "https://apex.example", snippet: "Heavy transport",
  query: "heavy haulage Kenya", provider: "Test", retrievedAt: "2026-09-19T00:00:00.000Z", isMock: false,
};

describe("real search provider", () => {
  it("caches normalized query and country without changing data mode", async () => {
    const search = vi.fn(async () => [realResult]);
    const backend: SearchBackend = { name: "Test", search };
    const provider = new RealSearchProvider(backend, new TtlCache<SearchResult[]>(60_000));
    await provider.search({ query: " Heavy  Haulage Kenya ", country: "Kenya" });
    const second = await provider.search({ query: "heavy haulage kenya", country: " kenya " });
    expect(second[0].isMock).toBe(false);
    expect(search).toHaveBeenCalledTimes(1);
  });

  it("fails closed when real credentials are missing", () => {
    expect(() => createRealSearchProvider({ SEARCH_PROVIDER: "brave" })).toThrowError(expect.objectContaining({
      code: "REAL_SEARCH_NOT_CONFIGURED",
    }));
  });

  it("maps Brave Web Search results into the common SearchProvider contract", async () => {
    let capturedUrl: URL | RequestInfo | undefined;
    let capturedInit: RequestInit | undefined;
    const fetcher = (async (input: URL | RequestInfo, init?: RequestInit) => {
      capturedUrl = input;
      capturedInit = init;
      return new Response(JSON.stringify({
        web: { results: [
          { title: "Apex Logistics", url: "https://apex.co.ke/about", description: "Heavy haulage in Kenya" },
          { title: "Missing URL" },
        ] },
      }), { status: 200, headers: { "Content-Type": "application/json" } });
    }) as typeof fetch;
    const provider = new BraveSearchProvider("test-key", fetcher, new TtlCache<SearchResult[]>(60_000));

    const results = await provider.search({ query: "heavy haulage company Kenya", country: "Kenya", limit: 5, page: 2 });

    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({
      title: "Apex Logistics",
      url: "https://apex.co.ke/about",
      snippet: "Heavy haulage in Kenya",
      provider: "Brave Search API",
      isMock: false,
    });
    const url = new URL(String(capturedUrl));
    expect(url.origin + url.pathname).toBe("https://api.search.brave.com/res/v1/web/search");
    expect(url.searchParams.get("q")).toBe("heavy haulage company Kenya");
    expect(url.searchParams.get("count")).toBe("5");
    expect(url.searchParams.get("offset")).toBe("1");
    expect(capturedInit?.headers).toMatchObject({ "X-Subscription-Token": "test-key" });
  });

  it("returns structured provider errors for Brave HTTP failures", async () => {
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ message: "Rate limit exceeded" }), {
      status: 429,
      headers: { "Content-Type": "application/json" },
    })) as unknown as typeof fetch;
    const provider = new BraveSearchProvider("test-key", fetcher, new TtlCache<SearchResult[]>(60_000));

    await expect(provider.search({ query: "q", country: "Kenya" })).rejects.toMatchObject({
      code: "SEARCH_PROVIDER_HTTP_ERROR",
      status: 502,
      retryable: true,
    });
  });

  it("selects Brave as the configured real provider", () => {
    expect(createRealSearchProvider({
      SEARCH_PROVIDER: "brave",
      BRAVE_SEARCH_API_KEY: "test-key",
    })).toBeInstanceOf(BraveSearchProvider);
  });

  it("uses an environment-configured proxy only for Brave requests", async () => {
    let capturedInit: (RequestInit & { dispatcher?: unknown }) | undefined;
    const fetchMock = vi.fn(async (_input: URL | RequestInfo, init?: RequestInit) => {
      capturedInit = init;
      return new Response(JSON.stringify({ web: { results: [] } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    try {
      const provider = createRealSearchProvider({
        SEARCH_PROVIDER: "brave",
        BRAVE_SEARCH_API_KEY: "test-key",
        BRAVE_SEARCH_PROXY_URL: "http://127.0.0.1:9999",
      });
      await provider.search({ query: "proxy test query", country: "Kenya" });
      expect(capturedInit?.dispatcher).toBeDefined();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("rejects invalid Brave proxy configuration before sending a request", () => {
    expect(() => createRealSearchProvider({
      SEARCH_PROVIDER: "brave",
      BRAVE_SEARCH_API_KEY: "test-key",
      BRAVE_SEARCH_PROXY_URL: "socks5://127.0.0.1:9999",
    })).toThrowError(expect.objectContaining({ code: "SEARCH_PROXY_NOT_CONFIGURED" }));
  });

  it("rejects Mock-labelled rows from a real backend", async () => {
    const backend: SearchBackend = { name: "Bad", search: async () => [{ ...realResult, isMock: true }] };
    await expect(new RealSearchProvider(backend).search({ query: "q", country: "Kenya" })).rejects.toMatchObject({ code: "DATA_MODE_VIOLATION" });
  });
});
