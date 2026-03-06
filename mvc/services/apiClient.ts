import { getApiBaseUrl } from './api';
import { ApiError } from '../types/api';
import { auth } from './firebase';

const TIMEOUT_MS = 10_000;

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined>,
): Promise<T> {
  const base = getApiBaseUrl();

  let url = `${base}${path}`;
  if (params) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== null && v !== '') {
        qs.append(k, String(v));
      }
    }
    const qsStr = qs.toString();
    if (qsStr) url += `?${qsStr}`;
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {};
    let fetchBody: string | undefined;

    // Attach Firebase auth token if user is logged in
    const currentUser = auth.currentUser;
    if (currentUser) {
      try {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      } catch {
        // proceed without token if getIdToken fails
      }
    }

    if (body !== undefined) {
      headers['Content-Type'] = 'application/json';
      fetchBody = JSON.stringify(body);
    }

    const resp = await fetch(url, {
      method,
      headers,
      body: fetchBody,
      signal: controller.signal,
    });

    if (!resp.ok) {
      let errorMsg = `Request failed (${resp.status})`;
      try {
        const data = await resp.json();
        if (data.error) errorMsg = data.error;
        else if (data.message) errorMsg = data.message;
      } catch {
        // use default message
      }
      throw new ApiError(errorMsg, resp.status);
    }

    return (await resp.json()) as T;
  } catch (err: any) {
    if (err instanceof ApiError) throw err;
    if (err.name === 'AbortError') {
      throw new ApiError('Request timed out', 408);
    }
    throw new ApiError(err.message || 'Network error', 0);
  } finally {
    clearTimeout(timer);
  }
}

export const apiClient = {
  get<T = any>(path: string, params?: Record<string, string | number | boolean | undefined>) {
    return request<T>('GET', path, undefined, params);
  },
  post<T = any>(path: string, body?: unknown) {
    return request<T>('POST', path, body);
  },
  put<T = any>(path: string, body?: unknown) {
    return request<T>('PUT', path, body);
  },
  delete<T = any>(path: string) {
    return request<T>('DELETE', path);
  },
};
