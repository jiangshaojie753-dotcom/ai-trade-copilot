import { normalizeCachePart, TtlCache } from "./cache";
import { ProviderError } from "./provider-error";
import type { SearchInput, SearchProvider, SearchResult } from "./providers";
import { ProxyAgent } from "undici";

type FetchLike = typeof fetch;
type ProxyFetchInit = RequestInit & { dispatcher?: ProxyAgent };

type GoogleSearchResponse = {
  items?: Array<{ title?: string; link?: string; snippet?: string }>;
  error?: { message?: string };
};

type BraveSearchResponse = {
  web?: { results?: Array<{ title?: string; url?: string; description?: string }> };
  message?: string;
  detail?: string;
  error?: { message?: string; detail?: string };
};

export type SearchBackend = {
  readonly name: string;
  search(input: SearchInput): Promise<SearchResult[]>;
};

const DEFAULT_TTL_MS = 15 * 60 * 1000;
const searchCache = new TtlCache<SearchResult[]>(DEFAULT_TTL_MS);
const proxyAgents = new Map<string, ProxyAgent>();

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

export class BraveSearchBackend implements SearchBackend {
  readonly name = "Brave Search API";

  constructor(
    private readonly apiKey: string,
    private readonly fetcher: FetchLike = fetch,
  ) {}

  async search(input: SearchInput): Promise<SearchResult[]> {
    const limit = Math.max(1, Math.min(input.limit ?? 10, 20));
    const page = Math.max(1, input.page ?? 1);
    const params = new URLSearchParams({
      q: input.query,
      count: String(limit),
      offset: String(page - 1),
      safesearch: "moderate",
      spellcheck: "true",
      text_decorations: "false",
    });
    let response: Response;
    try {
      response = await this.fetcher(`https://api.search.brave.com/res/v1/web/search?${params}`, {
        headers: {
          Accept: "application/json",
          "X-Subscription-Token": this.apiKey,
        },
        signal: AbortSignal.timeout(12_000),
      });
    } catch (error) {
      throw new ProviderError(
        `Brave Search request failed: ${describeFetchError(error)}`,
        "SEARCH_PROVIDER_REQUEST_FAILED",
        502,
        true,
      );
    }

    let payload: BraveSearchResponse;
    try {
      payload = await response.json() as BraveSearchResponse;
    } catch {
      throw new ProviderError(
        `Brave Search returned an invalid response (HTTP ${response.status}).`,
        "SEARCH_PROVIDER_INVALID_RESPONSE",
        502,
        response.status >= 500 || response.status === 429,
      );
    }
    if (!response.ok) {
      throw new ProviderError(
        payload.message ?? payload.detail ?? payload.error?.message ?? payload.error?.detail
          ?? `Brave Search returned HTTP ${response.status}.`,
        "SEARCH_PROVIDER_HTTP_ERROR",
        response.status >= 500 || response.status === 429 ? 502 : 400,
        response.status >= 500 || response.status === 429,
      );
    }

    const retrievedAt = new Date().toISOString();
    return (payload.web?.results ?? []).flatMap((item, index) => {
      if (!item.title || !item.url) return [];
      return [{
        id: `brave-${page}-${index}-${stableId(item.url)}`,
        title: item.title,
        url: item.url,
        snippet: item.description ?? "",
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
    const limit = Math.max(1, input.limit ?? 10);
    const key = `${normalizeCachePart(this.name)}|${normalizeCachePart(input.query)}|${normalizeCachePart(input.country)}|limit:${limit}|page:${page}`;
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

export class BraveSearchProvider implements SearchProvider {
  readonly name = "Brave Search API";
  readonly isMock = false;
  private readonly provider: RealSearchProvider;

  constructor(apiKey: string, fetcher: FetchLike = fetch, cache = searchCache) {
    this.provider = new RealSearchProvider(new BraveSearchBackend(apiKey, fetcher), cache);
  }

  search(input: SearchInput): Promise<SearchResult[]> {
    return this.provider.search(input);
  }
}

export function createRealSearchProvider(env: Record<string, string | undefined> = process.env): SearchProvider {
  const provider = (env.SEARCH_PROVIDER ?? "").trim().toLowerCase();
  if (!provider) {
    throw new ProviderError(
      "Real Search is not configured. Set SEARCH_PROVIDER=brave and BRAVE_SEARCH_API_KEY in .env.local.",
      "REAL_SEARCH_NOT_CONFIGURED",
      503,
      false,
    );
  }
  if (provider === "brave") {
    const apiKey = env.BRAVE_SEARCH_API_KEY?.trim();
    if (!apiKey) {
      throw new ProviderError(
        "Brave Search is not configured. Set BRAVE_SEARCH_API_KEY in .env.local.",
        "REAL_SEARCH_NOT_CONFIGURED",
        503,
        false,
      );
    }
    return new BraveSearchProvider(apiKey, createBraveFetcher(env));
  }
  if (provider === "google_cse") {
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
  throw new ProviderError(`Unsupported SEARCH_PROVIDER: ${provider}.`, "UNSUPPORTED_SEARCH_PROVIDER", 503, false);
}

function createBraveFetcher(env: Record<string, string | undefined>): FetchLike {
  const proxyUrl = env.BRAVE_SEARCH_PROXY_URL?.trim()
    || env.HTTPS_PROXY?.trim()
    || env.HTTP_PROXY?.trim();
  if (!proxyUrl) return fetch;

  let parsed: URL;
  try {
    parsed = new URL(proxyUrl);
  } catch {
    throw new ProviderError(
      "Brave Search proxy configuration is invalid. Check BRAVE_SEARCH_PROXY_URL, HTTPS_PROXY or HTTP_PROXY.",
      "SEARCH_PROXY_NOT_CONFIGURED",
      503,
      false,
    );
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new ProviderError(
      "Brave Search proxy must use an http:// or https:// URL.",
      "SEARCH_PROXY_NOT_CONFIGURED",
      503,
      false,
    );
  }

  let dispatcher = proxyAgents.get(parsed.href);
  if (!dispatcher) {
    dispatcher = new ProxyAgent(parsed.href);
    proxyAgents.set(parsed.href, dispatcher);
  }
  const proxyDispatcher = dispatcher;
  return ((input: Parameters<FetchLike>[0], init?: Parameters<FetchLike>[1]) => fetch(input, {
    ...init,
    dispatcher: proxyDispatcher,
  } as ProxyFetchInit)) as FetchLike;
}

function describeFetchError(error: unknown) {
  if (!(error instanceof Error)) return "Unknown network error";
  const cause = error.cause;
  if (cause instanceof Error && cause.message && cause.message !== error.message) {
    return `${error.message} (${cause.message})`;
  }
  return error.message;
}

function stableId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  return hash.toString(36);
}
