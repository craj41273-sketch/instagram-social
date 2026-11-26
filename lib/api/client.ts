/** Small browser helper for the Block 10 JSON endpoints. */

export async function fetchJson<T>(
  url: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  const payload: unknown = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error ?? "Request failed.")
        : "Request failed.";
    throw new Error(message);
  }

  return payload as T;
}

export function postJson<T>(url: string, body: unknown): Promise<T> {
  return fetchJson<T>(url, { method: "POST", body: JSON.stringify(body) });
}
