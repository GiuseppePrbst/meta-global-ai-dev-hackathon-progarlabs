export const apiUrl: string = import.meta.env.VITE_API_URL || "http://localhost:8000";

export class LabError extends Error {
  status: number;
  code?: string;
  retryAfter?: number;
  constructor(status: number, message: string, code?: string, retryAfter?: number) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export async function parseLabError(response: Response): Promise<LabError> {
  const retryAfter = Number(response.headers.get("Retry-After") || "") || undefined;
  const body = (await response.json().catch(() => null)) as
    | { detail?: string | { code?: string; message?: string } }
    | null;
  const detail = body?.detail;
  if (typeof detail === "string") return new LabError(response.status, detail, undefined, retryAfter);
  if (detail && typeof detail === "object") {
    return new LabError(response.status, detail.message || `El servicio respondio ${response.status}.`, detail.code, retryAfter);
  }
  return new LabError(response.status, `El servicio respondio ${response.status}. Intenta nuevamente.`, undefined, retryAfter);
}

export function bearer(token: string): Record<string, string> {
  return token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {};
}
