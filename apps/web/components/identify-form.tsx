"use client";

import { useEffect, useState } from "react";
import { apiFetch, validatePhoto } from "@/lib/api";
import { Icon } from "./icon";

type Identification = { status: string; provider: string; candidates: unknown[]; message: string; model: string | null };

export function IdentifyForm() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState("");
  const [adult, setAdult] = useState(false);
  const [rights, setRights] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<Identification | null>(null);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  async function analyze(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || !adult || !rights) return;
    setLoading(true); setError(""); setResult(null); setSaved(false);
    const data = new FormData(); data.append("file", file); data.append("adult_confirmed", "true"); data.append("rights_confirmed", "true");
    try { setResult(await (await apiFetch("/identify", { method: "POST", body: data })).json()); }
    catch (err) { setError(err instanceof Error ? err.message : "No fue posible conectar con la API."); }
    finally { setLoading(false); }
  }
  function saveDraft() {
    try {
      // shortcut: un borrador local sin fotografía ni coordenadas, migrar a API al incorporar autenticación y consentimiento.
      localStorage.setItem("bosque-vivo-observation-draft", JSON.stringify({ notes, identification_status: result?.status, provider: result?.provider, saved_at: new Date().toISOString() }));
      setSaved(true);
    } catch { setError("El navegador no permite guardar el borrador. Copia tus notas antes de salir."); }
  }
  function restoreDraft() {
    try {
      const raw = localStorage.getItem("bosque-vivo-observation-draft");
      if (!raw) { setDraftMessage("No hay un borrador guardado en este navegador."); return; }
      const draft: unknown = JSON.parse(raw);
      if (!draft || typeof draft !== "object" || !("notes" in draft) || typeof draft.notes !== "string" || draft.notes.length > 2000) throw new Error("invalid draft");
      setNotes(draft.notes); setDraftLoaded(true); setSaved(false);
      setDraftMessage("Borrador local recuperado. No contiene una identificación verificada.");
    } catch { setDraftMessage("El borrador no tiene un formato válido o no se puede leer."); }
  }
  return <div className="identify-grid"><form className="panel" onSubmit={analyze}>
    <p className="eyebrow">01 · TU OBSERVACIÓN</p><h2>Todo comienza con una mirada</h2><p>Una hoja, la corteza y el porte del árbol pueden aportar pistas. Evita personas y no extraigas material del bosque.</p>
    <label className="photo-upload" htmlFor="photo"><Icon name="camera" /><strong>Seleccionar fotografía</strong><span>JPEG, PNG o WebP · hasta 10 MiB</span><input id="photo" name="photo" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => {
      setResult(null); setSaved(false); setPreview("");
      const candidate = event.target.files?.[0];
      const message = candidate ? validatePhoto(candidate) : null;
      setError(message || ""); setFile(candidate && !message ? candidate : null);
      if (candidate && !message) setPreview(URL.createObjectURL(candidate));
    }} /></label>
    {file && preview && <figure className="photo-preview">
      {/* eslint-disable-next-line @next/next/no-img-element -- Blob local del usuario; no existe URL optimizable por el servidor. */}
      <img src={preview} alt="Vista previa de la fotografía seleccionada" />
      <figcaption>{file.name} · {(file.size / 1024 / 1024).toFixed(1)} MiB</figcaption>
    </figure>}
    <label className="checkbox"><input type="checkbox" checked={adult} onChange={(event) => setAdult(event.target.checked)} required />Soy mayor de 18 años.</label>
    <label className="checkbox"><input type="checkbox" checked={rights} onChange={(event) => setRights(event.target.checked)} required />Tengo derecho a usar esta imagen; no contiene datos restringidos, personas identificables ni infraestructura sensible.</label>
    <p className="small muted">Al continuar, la imagen se envía a tu API configurada. El adaptador de demostración no llama a Meta ni conserva la imagen.</p>
    <button className="button" disabled={!file || !adult || !rights || loading} type="submit"><Icon name="camera" />{loading ? "Procesando solicitud…" : "Probar flujo de identificación"}</button>
    {error && <p className="notice notice-error" role="alert">{error}</p>}
  </form><section className="panel result-panel" aria-label="Resultado de identificación" aria-live="polite">
    <p className="eyebrow">02 · INTERPRETAR CON CUIDADO</p><h2>{loading ? "Preparando la respuesta…" : result ? "Información insuficiente" : draftLoaded ? "Tu borrador local" : "Cada pista cuenta"}</h2>
    {!result && !loading && !draftLoaded && <div className="empty-state"><span className="section-icon"><Icon name="leaf" /></span><p>Selecciona una fotografía para probar el recorrido. Aquí verás candidatos y sus limitaciones cuando la integración real esté disponible.</p><span className="tag">Sin modelo conectado</span></div>}
    {loading && <p role="status">Consultando la API. Esta base utiliza un adaptador mock sin inferencia real.</p>}
    {result && <><div className="notice"><strong>Modo demostración · {result.provider}</strong><p>{result.message}</p></div><p>No se ha identificado una especie. No se muestran probabilidades ni candidatos simulados.</p></>}
    {(result || draftLoaded) && <><label htmlFor="observation-notes">Notas de la observación<textarea id="observation-notes" maxLength={2000} rows={4} value={notes} onChange={(event) => { setNotes(event.target.value); setSaved(false); }} placeholder="Describe la hoja, el entorno o qué quisieras revisar." /></label><button className="button button-secondary" onClick={saveDraft}>Guardar borrador en este dispositivo</button><p className="small muted">Se conserva un único borrador local de texto, que reemplaza al anterior. No se guarda la fotografía ni se publica una observación.</p>{saved && <p className="notice" role="status">Borrador de demostración guardado en este navegador.</p>}</>}
    <button className="button button-secondary restore-draft" onClick={restoreDraft}>Recuperar borrador de este dispositivo</button>
    {draftMessage && <p className="notice" role="status">{draftMessage}</p>}
  </section></div>;
}
