import { describe, expect, it, vi } from "vitest";
import { TtlCache } from "./cache";
import { createRealSearchProvider, RealSearchProvider, type SearchBackend } from "./real-search-provider";
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
    expect(() => createRealSearchProvider({})).toThrow(/not configured/i);
  });

  it("rejects Mock-labelled rows from a real backend", async () => {
    const backend: SearchBackend = { name: "Bad", search: async () => [{ ...realResult, isMock: true }] };
    await expect(new RealSearchProvider(backend).search({ query: "q", country: "Kenya" })).rejects.toMatchObject({ code: "DATA_MODE_VIOLATION" });
  });
});
