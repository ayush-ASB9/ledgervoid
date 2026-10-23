const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 5;
const MAX_TRACKED_CLIENTS = 1000;

const requestsByClient = new Map<string, number[]>();

export function isAnalysisRateLimited(clientId: string, now = Date.now()): boolean {
  const recentRequests = (requestsByClient.get(clientId) ?? [])
    .filter((timestamp) => now - timestamp < WINDOW_MS);

  if (recentRequests.length >= MAX_REQUESTS_PER_WINDOW) {
    requestsByClient.set(clientId, recentRequests);
    return true;
  }

  if (requestsByClient.size >= MAX_TRACKED_CLIENTS && !requestsByClient.has(clientId)) {
    const oldestClient = requestsByClient.keys().next().value;
    if (oldestClient) requestsByClient.delete(oldestClient);
  }

  requestsByClient.set(clientId, [...recentRequests, now]);
  return false;
}
