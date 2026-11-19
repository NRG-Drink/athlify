export class SessionRequestInvalidatedError extends Error {
  constructor() {
    super("The session request belongs to an inactive session.");
    this.name = "SessionRequestInvalidatedError";
  }
}

let sessionGeneration = 0;
let sessionRequestQueue: Promise<void> = Promise.resolve();

export function getSessionGeneration(): number {
  return sessionGeneration;
}

export function isSessionGenerationCurrent(generation: number): boolean {
  return generation === sessionGeneration;
}

export function invalidateSessionRequests(): void {
  sessionGeneration += 1;
}

export function runSessionRequest<T>(request: () => Promise<T>): Promise<T> {
  const result = sessionRequestQueue.then(request, request);
  sessionRequestQueue = result.then(
    () => undefined,
    () => undefined,
  );
  return result;
}
