import { useEffect, useRef, useState } from "react";
import { LabError } from "../lib/api";
import {
  assessmentLabel, fetchSpeciesCatalog, fetchTaxonLink, identifyPhoto, validatePhoto,
  type Identification, type SpeciesInfo,
} from "../lib/identify";

export function SpeciesLab({ token = "" }: { token?: string }) {
  const [demoMode, setDemoMode] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [adult, setAdult] = useState(false);
  const [rights, setRights] = useState(false);
  const [external, setExternal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Identification | null>(null);
  const [catalog, setCatalog] = useState<SpeciesInfo[]>([]);
  const [taxonLinks, setTaxonLinks] = useState<Record<string, boolean>>({});
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  useEffect(() => {
    const c = new AbortController();
    fetchSpeciesCatalog(c.signal).then(setCatalog).catch(() => setCatalog([]));
    return () => c.abort();
  }, []);

  const nameOf = (id: string) => catalog.find((s) => s.id === id);

  async function analyze(event: React.FormEvent) {
    event.preventDefault();
    if (!file || !adult || !rights || !external) return;
    setBusy(true); setError(""); setResult(null);
    const c = new AbortController(); abortRef.current = c;
    try {
      const r = await identifyPhoto(file, { signal: c.signal, token: demoMode ? token : "" });
      setResult(r);
      const ids = [...r.candidates, ...r.exploratory_candidates].map((x) => x.species_id);
      const links: Record<string, boolean> = {};
      await Promise.all(ids.map(async (id) => { links[id] = (await fetchTaxonLink(id, c.signal)) !== null; }));
      setTaxonLinks(links);
    } catch (err) {
      if (err instanceof LabError) setError(`${err.message} (${err.status})`);
      else if ((err as Error)?.name !== "AbortError") setError("No fue posible conectar con la API de identificacion.");
    } finally { setBusy(false); }
  }
  function reset() {
    abortRef.current?.abort();
    setFile(null); setPreview(""); setResult(null); setError(""); setBusy(false);
  }
  const candidateList = (items: Identification["candidates"], title: string) => items.length > 0 && (
    <section aria-label={title}><h3>{title}</h3>
      <ul className="list">{items.map((cand) => { const info = nameOf(cand.species_id); return (
        <li key={cand.species_id}>
          <strong>{info?.common_name ?? cand.species_id}</strong>{info && <> · <i>{info.scientific_name}</i></>} <span className="tag">{cand.species_id}</span>
          <p>{cand.evidence}</p>
          {cand.contradictory_evidence.length > 0 && <p className="small">En contra: {cand.contradictory_evidence.join(" ")}</p>}
          {taxonLinks[cand.species_id] && <p className="small">Vinculo verificado en el Atlas: /taxa/{cand.species_id}</p>}
        </li>); })}
      </ul>
    </section>
  );

  return (
    <section className="card" aria-label="Explora una especie">
      <p className="kicker">MODULO B · RECONOCIMIENTO VISUAL</p>
      <h2>Explora una especie</h2>
      <p>Pipeline real: <code>POST /identify</code> con Muse Spark 1.3 y verificacion de conjunto abierto sobre
        <strong> 8 especies de arboles</strong>. Fauna y hongos no estan habilitados para foto: el sistema debe abstenerse.
        El pipeline <strong>no emite puntajes numericos ni probabilidades</strong>; muestra evidencia textual y aceptacion, nunca una certeza.</p>
      <form onSubmit={analyze}>
        <label className="upload">Seleccionar o capturar fotografia (JPEG, PNG o WebP · hasta 10 MiB)
          <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" aria-label="Seleccionar o capturar fotografia"
            onChange={(e) => {
              const cand = e.target.files?.[0];
              const msg = cand ? validatePhoto(cand) : null;
              setError(msg || ""); setResult(null);
              setFile(cand && !msg ? cand : null);
              setPreview(cand && !msg ? URL.createObjectURL(cand) : "");
            }} />
        </label>
        {preview && <figure><img className="preview" src={preview} alt="Vista previa de la fotografia seleccionada" />
          <figcaption className="small">{file?.name} · {file ? (file.size / 1024 / 1024).toFixed(2) : "0"} MiB</figcaption></figure>}
        <label className="check"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} /> Soy mayor de 18 anos.</label>
        <label className="check"><input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} /> Tengo derecho a usar esta imagen; sin personas ni datos restringidos.</label>
        <label className="check"><input type="checkbox" checked={external} onChange={(e) => setExternal(e.target.checked)} /> Acepto que el backend envie esta imagen a Meta.</label>
        <label className="check"><input type="checkbox" checked={demoMode} disabled={!token.trim()} onChange={(e) => setDemoMode(e.target.checked)} /> Backend en SERVICE_MODE=demo: enviar mi token (la reserva queda en el ledger por identidad).</label>
        <div className="row">
          <button className="btn" type="submit" disabled={!file || !adult || !rights || !external || busy}>{busy ? "Analizando…" : "Analizar fotografia"}</button>
          <button className="btn alt" type="button" onClick={reset}>Probar con otra imagen</button>
          {busy && <button className="btn alt" type="button" onClick={() => abortRef.current?.abort()}>Cancelar analisis</button>}
        </div>
      </form>
      {error && <p className="notice err" role="alert">{error}</p>}
      {busy && <p className="notice" role="status">Enviando la imagen al pipeline real. En modo mock no hay inferencia; con Meta puede tardar.</p>}
      {result && (
        <article aria-label="Resultado del reconocimiento">
          <p><span className="tag">{result.provider === "mock" ? "Modo mock: sin inferencia real" : `Meta · ${result.model ?? ""}`}</span>{" "}
            <span className="tag">{assessmentLabel(result.catalog_assessment)}</span>{" "}
            <span className="tag">{result.acceptance === "accepted" ? `Sugerencia, no verificada: ${result.accepted_species_id}` : "Sin especie aceptada"}</span></p>
          <p role="status">{result.message}</p>
          {candidateList(result.candidates, "Especies candidatas")}
          {candidateList(result.exploratory_candidates, "Candidatas exploratorias (no aceptadas)")}
          {result.similar_out_of_catalog.length > 0 && <p className="small">Similares fuera del catalogo: {result.similar_out_of_catalog.join(", ")}</p>}
          {result.observed_traits.length > 0 && <p className="small">Rasgos observados: {result.observed_traits.join("; ")}</p>}
          {result.missing_traits.length > 0 && <p className="small">Rasgos que faltan: {result.missing_traits.join("; ")}</p>}
          {result.recommended_next_photo && <p className="notice" role="status">Siguiente foto recomendada: {result.recommended_next_photo}</p>}
          {result.limitations.length > 0 && <div className="notice"><strong>Limitaciones</strong>{result.limitations.map((l) => <p key={l}>{l}</p>)}</div>}
          <p className="small">Catalogo soportado: {catalog.length ? catalog.map((s) => s.common_name).join(", ") : "8 arboles (API no disponible para listarlos)"}. Estrategia: {result.strategy ?? "—"}</p>
        </article>
      )}
    </section>
  );
}
