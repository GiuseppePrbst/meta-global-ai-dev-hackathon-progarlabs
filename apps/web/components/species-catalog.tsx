"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { demoSpecies, filterSpecies, type Species } from "@/lib/catalog";
import { Icon } from "./icon";

export function SpeciesCatalog() {
  const [species, setSpecies] = useState<Species[]>([]);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Cargando catálogo…");
  const [selected, setSelected] = useState<Species | null>(null);
  useEffect(() => {
    const controller = new AbortController();
    apiFetch("/species", { signal: controller.signal })
      .then((res) => res.json())
      .then((data: Species[]) => { setSpecies(data); setStatus("Catálogo inicial de la API · taxonomía provisional"); })
      .catch(() => { if (!controller.signal.aborted) { setSpecies(demoSpecies); setStatus("API no disponible. Mostrando datos de demostración locales, sin validación taxonómica."); } });
    return () => controller.abort();
  }, []);

  const filtered = filterSpecies(species, query);
  return <>
    <div className="catalog-toolbar"><label htmlFor="species-search">Buscar en el catálogo<input id="species-search" type="search" placeholder="Nombre común o científico" value={query} onChange={(event) => setQuery(event.target.value)} /></label><span>{species.length} especies candidatas</span></div>
    <p className="notice" role="status">{status}</p>
    <div className="species-grid">{filtered.map((item, index) => <button key={item.id} className="species-card" onClick={() => setSelected(item)} aria-label={`Ver ficha de ${item.common_name}`}>
      <span className={`species-art art-${index % 4}`}><Icon name="leaf" /><span className="specimen-number">{String(index + 1).padStart(2, "0")} / CATÁLOGO</span></span>
      <span className="species-card-body"><span className="tag">Por validar</span><strong>{item.common_name}</strong><i>{item.scientific_name}</i><span className="card-link">Consultar ficha <Icon name="arrow" /></span></span>
    </button>)}</div>
    {species.length > 0 && filtered.length === 0 && <div className="empty-state"><Icon name="leaf" /><h2>No encontramos coincidencias</h2><p>Prueba con otro nombre. Este catálogo inicial contiene solo ocho especies.</p><button className="button button-secondary" onClick={() => setQuery("")}>Limpiar búsqueda</button></div>}
    {selected && <section className="panel species-detail" aria-label={`Ficha de ${selected.common_name}`}>
      <button className="text-button" onClick={() => setSelected(null)}>Cerrar ficha ×</button><p className="eyebrow">FICHA BOTÁNICA PROVISIONAL</p><h2>{selected.common_name}</h2><p><i>{selected.scientific_name}</i></p><p>Nombre candidato para el piloto. Los rasgos diagnósticos, la taxonomía aceptada y la presencia georreferenciada están pendientes de validación científica.</p><p><strong>Procedencia:</strong> {selected.provenance.source_name}</p><p><strong>Licencia:</strong> {selected.provenance.license}</p><a className="inline-link" href={selected.provenance.source_url} target="_blank" rel="noreferrer">Consultar fuente de referencia ↗</a>
    </section>}
  </>;
}
