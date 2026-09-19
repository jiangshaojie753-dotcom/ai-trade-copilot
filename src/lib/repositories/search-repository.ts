import type { DiscoveryResponse } from "../discovery-types";

export interface SearchRepository {
  saveDiscovery(result: DiscoveryResponse, input: { product: string; country: string; city?: string; buyerType?: string }): Promise<void>;
}
