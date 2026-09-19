export class ProviderError extends Error {
  constructor(
    message: string,
    readonly code: string,
    readonly status = 502,
    readonly retryable = true,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}
