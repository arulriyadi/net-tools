/** Server-side fetch helper for FastAPI backend (PostgreSQL). */

export function getNettoolsApiUrl(): string {
  return process.env.NETTOOLS_API_URL || "http://127.0.0.1:8090"
}

export class NettoolsApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
    this.name = "NettoolsApiError"
  }
}

export async function nettoolsFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const url = `${getNettoolsApiUrl()}${path}`
  const res = await fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
    cache: "no-store",
  })

  if (!res.ok) {
    let detail = res.statusText
    try {
      const body = (await res.json()) as { detail?: string }
      detail = body.detail ?? detail
    } catch {
      // ignore
    }
    throw new NettoolsApiError(detail, res.status)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
