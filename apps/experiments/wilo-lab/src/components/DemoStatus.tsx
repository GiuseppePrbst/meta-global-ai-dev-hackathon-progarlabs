import { useEffect, useState } from "react";
import { apiUrl } from "../lib/api";

type Status = { status: string; expires_at: string; features: string[]; territory_eligible: boolean | null; notice: string };

// Sin token: GET /demo/status dice si la IA publica esta abierta y da el aviso legal.
export function DemoStatus() {
  const [status, setStatus] = useState<Status | null>(null);
  useEffect(() => {
    const c = new AbortController();
    fetch(`${apiUrl}/demo/status`, { signal: c.signal })
      .then((r) => (r.ok ? r.json() : null)).then(setStatus).catch(() => setStatus(null));
    return () => c.abort();
  }, []);
  if (!status) return null;
  return (
    <div className="notice" role="status" aria-label="Estado de la demostracion publica">
      <strong>{status.status === "active" ? "Public demo active: no login needed" : `Demo status: ${status.status}`}</strong>
      {status.status === "active" && <p className="small">Funciones abiertas: {status.features.join(", ")} · hasta {status.expires_at}</p>}
      {status.territory_eligible === false && <p>Servicio no disponible en este territorio.</p>}
      <p className="small">{status.notice} <a href="https://progarlabs.com/privacidad#bosque-vivo" target="_blank" rel="noreferrer">Política de privacidad ↗</a></p>
    </div>
  );
}
