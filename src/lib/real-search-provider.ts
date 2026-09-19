import { normalizeCachePart, TtlCache } from "./cache";
import { ProviderError } from "./provider-error";
import type { SearchInput, SearchProvider, SearchResult } from "./providers";

type FetchLike = typeof fetch;

type GoogleSearchResponse = {
  items?: Array<{ title?: string; link?: string; snippet?: string }>;
  error?: { message?: string };
};

export type SearchBackend = {
  readonly name: string;
  search(input: SearchInput): Promise<SearchResult[]>;
};

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const searchCache = new TtlCache<SearchResult[]>(DEFAULT_TTL_MS);

export class GoogleProgrammableSearchBackend implements SearchBackend {
  readonly name = "Google Programmable Search JSON API";

  constructor(
    private readonly apiKey: string,
    private readonly searchEngineId: string,
    private readonly fetcher: FetchLike = fetch,
  ) {}

  async search(input: SearchInput): Promise<SearchResult[]> {
    const limit = Math.max(1, Math.min(input.limit ?? 10, 10));
    const page = Math.max(1, input.page ?? 1);
    const params = new URLSearchParams({
      key: this.apiKey,
      cx: this.searchEngineId,
      q: input.query,
      num: String(limit),
      start: String((page - 1) * limit + 1),
      safe: "active",
      filter: "1",
    });
    const response = await this.fetcher(`https://customsearch.googleapis.com/customsearch/v1?${params}`, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12_000),
    });
    const payload = await response.json() as GoogleSearchResponse;
    if (!response.ok) {
      throw new ProviderError(
        payload.error?.message ?? `Search provider returned HTTP ${response.status}.`,
        "SEARCH_PROVIDER_HTTP_ERROR",
        response.status >= 500 ? 502 : 400,
        response.status >= 500 || response.status === 429,
      );
    }
    const retrievedAt = new Date().toISOString();
    return (payload.items ?? []).flatMap((item, index) => {
      if (!item.title || !item.link) return [];
      return [{
        id: `google-${page}-${index}-${stableId(item.link)}`,
        title: item.title,
        url: item.link,
        snippet: item.snippet ?? "",
        query: input.query,
        provider: this.name,
        retrievedAt,
        isMock: false,
      } satisfies SearchResult];
    });
  }
}

export class RealSearchProvider implements SearchProvider {
  readonly isMock = false;
  readonly name: string;

  constructor(private readonly backend: SearchBackend, private readonly cache = searchCache) {
    this.name = backend.name;
  }

  async search(input: SearchInput): Promise<SearchResult[]> {
    const page = Math.max(1, input.page ?? 1);
    const key = `${normalizeCachePart(input.query)}|${normalizeCachePart(input.country)}|page:${page}`;
    const cached = this.cache.get(key);
    if (cached) return cached;
    const results = await this.backend.search(input);
    if (results.some((result) => result.isMock)) {
      throw new ProviderError("A real search provider returned Mock-labelled data.", "DATA_MODE_VIOLATION", 500, false);
    }
    this.cache.set(key, results);
    return results;
  }
}

export function createRealSearchProvider(env: Record<string, string | undefined> = process.env): RealSearchProvider {
  const provider = (env.SEARCH_PROVIDER ?? "").trim().toLowerCase();
  if (!provider) {
    throw new ProviderError(
      "Real Search is not configured. Set SEARCH_PROVIDER, SEARCH_API_KEY and GOOGLE_CSE_ID in .env.local.",
      "REAL_SEARCH_NOT_CONFIGURED",
      503,
      false,
    );
  }
  if (provider !== "google_cse") {
    throw new ProviderError(`Unsupported SEARCH_PROVIDER: ${provider}.`, "UNSUPPORTED_SEARCH_PROVIDER", 503, false);
  }
  const apiKey = env.SEARCH_API_KEY?.trim();
  const searchEngineId = env.GOOGLE_CSE_ID?.trim();
  if (!apiKey || !searchEngineId) {
    throw new ProviderError(
      "Google Programmable Search requires SEARCH_API_KEY and GOOGLE_CSE_ID in .env.local.",
      "REAL_SEARCH_NOT_CONFIGURED",
      503,
      false,
    );
  }
  return new RealSearchProvider(new GoogleProgrammableSearchBackend(apiKey, searchEngineId));
}

function stableId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash.toString(36);
}
