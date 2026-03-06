/** Standard API response wrapper */
export interface ApiResponse<_T = any> {
  ok: boolean;
  error?: string;
  message?: string;
  [key: string]: any;
}

/** Typed error from API calls */
export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}
