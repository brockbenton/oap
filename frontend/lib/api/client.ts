import { ApiError } from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? '';

export class ApiRequestError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string } = {},
): Promise<T> {
  const { token, ...fetchOptions } = options;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(fetchOptions.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}/api/v1${path}`, {
    credentials: 'omit',
    ...fetchOptions,
    headers,
  });

  const body = (await response.json()) as { data: T } | ApiError;

  if (!response.ok) {
    const errBody = body as ApiError;
    throw new ApiRequestError(
      errBody.error?.code ?? 'UNKNOWN',
      errBody.error?.message ?? 'Request failed',
      response.status,
    );
  }

  return (body as { data: T }).data;
}
