"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { Icon } from "./icon";

type ForestSource = { id: string; name: string; status: string; source_url: string; interpretation: string; license: string };

export function ForestPanel() {
  const [sources, setSources] = useState<ForestSource[] | null>(null);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  async function loadSources() {
    setLoading(true); setStatus("");
    try { setSources(await (await apiFetch("/forest/sources")).json()); }
    catch { setStatus("No se pudo consultar el servicio forestal. Inicia la API e inténtalo de nuevo."); }
    finally { setLoading(false); }
  }
  return <section className="panel forest-panel"><div className="section-icon"><Icon name="layers" /></div><p className="eyebrow">COMPRENDER EL BOSQUE</p><h2>Más allá de un árbol</h2><p>Conecta la observación con el territorio. La altura de copa estimada será nuestra primera capa de inteligencia forestal.</p><label htmlFor="forest-area">Área de consulta<select id="forest-area"><option>Entorno de Puyehue · referencia inicial</option></select></label><button className="button button-secondary" onClick={loadSources} disabled={loading}>{loading ? "Consultando…" : "Consultar capa CHMv2"}<Icon name="arrow" /></button>
    <p className="small muted">No hay un raster cargado. Aún no se calculan alturas ni estadísticas de área.</p>
    {status && <p className="notice notice-error" role="alert">{status}</p>}
    {sources?.map((source) => <div className="source-detail" key={source.id}><h3>{source.name}</h3><p className="tag">Integración pendiente</p><p>{source.interpretation}</p><p className="small">Licencia: {source.license}</p><a className="inline-link" href={source.source_url} target="_blank" rel="noreferrer">Revisar procedencia ↗</a></div>)}
  </section>;
}
