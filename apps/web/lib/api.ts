export const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function apiFetch(path: string, options?: RequestInit): Promise<Response> {
  const response = await fetch(`${apiUrl}${path}`, {
    ...options,
    signal: options?.signal ?? AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => null);
    throw new Error(typeof error?.detail === "string" ? error.detail : `El servicio respondió ${response.status}. Intenta nuevamente.`);
  }
  return response;
}

export function validatePhoto(file: Pick<File, "type" | "size">): string | null {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) return "Elige una imagen JPEG, PNG o WebP.";
  if (file.size === 0 || file.size > 10 * 1024 * 1024) return "La imagen debe tener contenido y pesar como máximo 10 MiB.";
  return null;
}
