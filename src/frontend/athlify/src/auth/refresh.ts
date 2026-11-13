import { authUrl, readAccessTokenResponse } from "./api";
import { authEvents } from "./events";
import {
  getSessionGeneration,
  isSessionGenerationCurrent,
  runSessionRequest,
  SessionRequestInvalidatedError,
} from "./sessionRequests";
import { tokenStore } from "./tokenStore";

let refreshInFlight: {
  generation: number;
  promise: Promise<string | null>;
} | null = null;
let refreshAbortController: AbortController | null = null;
let refreshFailure: Error | null = null;

export function clearRefreshFailure(): void {
  refreshFailure = null;
}

export function invalidateRefreshRequests(resetFailure = true): void {
  refreshAbortController?.abort();
  refreshAbortController = null;
  refreshInFlight = null;
  if (resetFailure) refreshFailure = null;
}

export function refreshAccessToken(): Promise<string | null> {
  if (refreshFailure) return Promise.reject(refreshFailure);
  const generation = getSessionGeneration();
  if (refreshInFlight?.generation === generation) {
    return refreshInFlight.promise;
  }

  const request = runSessionRequest(async () => {
    if (!isSessionGenerationCurrent(generation)) {
      throw new SessionRequestInvalidatedError();
    }

    const controller = new AbortController();
    refreshAbortController = controller;
    try {
      const response = await fetch(authUrl("refresh"), {
        method: "POST",
        credentials: "include",
        signal: controller.signal,
      });
      if (response.status === 401) {
        if (!isSessionGenerationCurrent(generation)) {
          throw new SessionRequestInvalidatedError();
        }
        tokenStore.clear();
        refreshFailure = null;
        return null;
      }
      if (!response.ok) {
        throw new Error(`Session refresh failed (HTTP ${response.status}).`);
      }

      const data = await readAccessTokenResponse(response);
      if (!isSessionGenerationCurrent(generation)) {
        throw new SessionRequestInvalidatedError();
      }
      tokenStore.set(data.token, data.expiresAt);
      refreshFailure = null;
      authEvents.dispatchEvent(new Event("token-updated"));
      return data.token;
    } catch (error) {
      if (!isSessionGenerationCurrent(generation)) {
        throw new SessionRequestInvalidatedError();
      }
      const failure =
        error instanceof Error
          ? error
          : new Error("Session refresh failed.", { cause: error });
      refreshFailure = failure;
      throw failure;
    } finally {
      if (refreshAbortController === controller) {
        refreshAbortController = null;
      }
    }
  });
  const promise = request.finally(() => {
    if (refreshInFlight?.promise === promise) {
      refreshInFlight = null;
    }
  });

  refreshInFlight = { generation, promise };
  return promise;
}
