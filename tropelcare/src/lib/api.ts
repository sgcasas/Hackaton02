export class ApiError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions {
  params?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
}

const BASE = import.meta.env.VITE_API_BASE_URL as string;

function buildQuery(params?: Record<string, string | number | undefined>): string {
  if (!params) return '';
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') q.set(k, String(v));
  }
  const s = q.toString();
  return s ? `?${s}` : '';
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  opts?: RequestOptions,
): Promise<T> {
  const token = localStorage.getItem('tropelcare_token');
  const res = await fetch(`${BASE}${path}${buildQuery(opts?.params)}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal: opts?.signal,
  });

  if (!res.ok) {
    let payload: { error?: string; message?: string; details?: unknown } = {};
    try {
      payload = (await res.json()) as typeof payload;
    } catch {
      // ignore parse error
    }
    throw new ApiError(
      res.status,
      payload.error ?? 'ERROR',
      payload.message ?? res.statusText,
      payload.details,
    );
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => request<T>('GET', path, undefined, opts),
  post: <T>(path: string, body: unknown, opts?: RequestOptions) =>
    request<T>('POST', path, body, opts),
  patch: <T>(path: string, body: unknown, opts?: RequestOptions) =>
    request<T>('PATCH', path, body, opts),
};
