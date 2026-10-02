import { type ApiError, ApiFailureSchema, ApiSuccessEnvelopeSchema } from "@testpulse/shared";
import type { z } from "zod";

/** Error thrown for non-success API envelopes, carrying the shared error code and request ID. */
export class ApiClientError extends Error {
  readonly status: number;
  readonly error: ApiError;

  constructor(status: number, error: ApiError) {
    super(error.message);
    this.name = "ApiClientError";
    this.status = status;
    this.error = error;
  }
}

export interface ApiClientOptions {
  /** Base URL. Empty string = same origin (`/api/...` proxied by Next.js in the free profile). */
  baseUrl?: string;
  fetch?: typeof fetch;
}

export interface RequestOptions<T extends z.ZodType> {
  path: string;
  schema: T;
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  signal?: AbortSignal;
}

/**
 * Typed API client used by every React Query hook (frontend skill §1). Sends cookies, parses the
 * shared envelope with Zod, and throws `ApiClientError` for failures. Session refresh on 401 is
 * added in P03-S01.
 */
export function createApiClient({ baseUrl = "", fetch: fetchImpl = fetch }: ApiClientOptions = {}) {
  return async function request<T extends z.ZodType>({
    path,
    schema,
    method = "GET",
    body,
    signal,
  }: RequestOptions<T>): Promise<z.infer<T>> {
    const response = await fetchImpl(`${baseUrl}${path}`, {
      method,
      credentials: "include",
      headers: body === undefined ? { accept: "application/json" } : { "content-type": "application/json", accept: "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(signal ? { signal } : {}),
    });

    const json: unknown = await response.json().catch(() => undefined);

    const failure = ApiFailureSchema.safeParse(json);
    if (failure.success) {
      throw new ApiClientError(response.status, failure.data.error);
    }
    const envelope = ApiSuccessEnvelopeSchema.safeParse(json);
    const payload = envelope.success ? schema.safeParse(envelope.data.data) : undefined;
    if (!payload?.success) {
      throw new ApiClientError(response.status, {
        code: "INTERNAL",
        message: `Unexpected response from ${method} ${path} (HTTP ${response.status})`,
      });
    }
    return payload.data;
  };
}
