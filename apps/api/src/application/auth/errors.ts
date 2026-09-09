export class RateLimitedError extends Error {
  readonly code = "RATE_LIMITED";

  constructor(message = "Rate limit exceeded") {
    super(message);
    this.name = "RateLimitedError";
  }
}
