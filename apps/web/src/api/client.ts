export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }
}

function messageFrom(body: unknown): string | undefined {
  if (typeof body === 'object' && body !== null && 'message' in body) {
    const { message } = body;
    if (typeof message === 'string') return message;
    if (Array.isArray(message)) return message.join(', ');
  }
  return undefined;
}

type ApiRequestInit = Omit<RequestInit, 'body'> & { json?: unknown; body?: BodyInit };

/** Llamada a la API (`/api/...`) con la cookie de sesión. Lanza `ApiError` si la respuesta no es 2xx. */
export async function api<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { json, headers, body, ...rest } = init;
  const response = await fetch(`/api${path}`, {
    credentials: 'same-origin',
    ...rest,
    headers: {
      Accept: 'application/json',
      ...(json !== undefined && { 'Content-Type': 'application/json' }),
      ...headers,
    },
    body: json !== undefined ? JSON.stringify(json) : body,
  });

  if (response.status === 204) return undefined as T;

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload: unknown = isJson ? await response.json() : await response.text();
  if (!response.ok) {
    throw new ApiError(response.status, messageFrom(payload) ?? response.statusText, payload);
  }
  return payload as T;
}
