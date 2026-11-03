import { useEffect, useRef, useState } from "react";
import { LabError } from "../lib/api";
import {
  encodeWavPcm16, fetchKnowledgeStatus, fetchPark, fetchParkMap, fetchParkTrails, fetchParks,
  openingLabel, queryGuide, resampleTo16k, sourceLabel, transcribeWav,
  type GuideAnswer, type LanguageHint, type ParkMap as ParkMapData, type Trail,
} from "../lib/wilo";
import { ParkMap } from "./ParkMap";

type Phase = "inicial" | "grabando" | "transcribiendo" | "revision" | "consultando"
  | "respuesta" | "insuficiente" | "error-proveedor" | "limite" | "cancelado" | "sin-acceso";
type Turn = { question: string; answer: GuideAnswer };

const PRESETS: { id: string; label: string; question: string; hint: LanguageHint }[] = [
  { id: "A", label: "A · Puyehue", question: "¿Qué senderos hay en el Parque Nacional Puyehue?", hint: "es" },
  { id: "B", label: "B · Anticura", question: "¿Qué senderos hay en el sector Anticura del Parque Nacional Puyehue?", hint: "es" },
  { id: "C", label: "C · Biodiversidad", question: "¿Qué es el coigüe y cómo se diferencia del ulmo?", hint: "es" },
  { id: "D", label: "D · English", question: "What trails are in Puyehue National Park? Please answer in English.", hint: "en" },
];

export function WiloChat({ token }: { token: string }) {
  const [phase, setPhase] = useState<Phase>("inicial");
  const [hint, setHint] = useState<LanguageHint>("auto");
  const [adult, setAdult] = useState(false);
  const [rights, setRights] = useState(false);
  const [external, setExternal] = useState(false);
  const [question, setQuestion] = useState("");
  const [transcript, setTranscript] = useState("");
  const [history, setHistory] = useState<Turn[]>([]);
  const [error, setError] = useState("");
  const [retryAfter, setRetryAfter] = useState<number | undefined>();
  const [elapsed, setElapsed] = useState(0);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [parks, setParks] = useState<{ id: string; name: string; trail_count: number }[]>([]);
  const [parkQuery, setParkQuery] = useState("");
  const [parkDetail, setParkDetail] = useState<{ name: string; area_ha: number | null; official_url: string } | null>(null);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [parkMap, setParkMap] = useState<ParkMapData | null>(null);
  const [atlasNote, setAtlasNote] = useState("Cargando Atlas…");
  const abortRef = useRef<AbortController | null>(null);
  const mediaRef = useRef<{ stop: () => void; cancel: () => void } | null>(null);

  useEffect(() => {
    const c = new AbortController();
    Promise.all([fetchParks("", c.signal), fetchKnowledgeStatus(c.signal)])
      .then(([page, s]) => {
        setParks(page.items);
        setAtlasNote(`Atlas vigente: ${s.counts.Park ?? 46} parques · ${s.counts.Trail ?? 199} senderos · ${s.counts.Taxon ?? 20} taxones. Sin trazados GPS.`);
      })
      .catch(() => { if (!c.signal.aborted) setAtlasNote("Atlas no disponible. Revisa que la API este en http://localhost:8000."); });
    return () => c.abort();
  }, []);
  useEffect(() => {
    if (phase !== "consultando") return;
    const t = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);
  useEffect(() => {
    if (phase !== "grabando") return;
    const t = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [phase]);

  function fail(err: unknown) {
    if (err instanceof LabError) {
      setError(err.message); setRetryAfter(err.retryAfter);
      if (err.status === 401) setPhase("sin-acceso");
      else if (err.status === 429) setPhase("limite");
      else setPhase("error-proveedor");
      return;
    }
    setError(err instanceof Error ? err.message : "No fue posible conectar con la API.");
    setPhase("error-proveedor");
  }
  async function loadPark(parkId: string) {
    try {
      const [d, t, m] = await Promise.all([fetchPark(parkId), fetchParkTrails(parkId), fetchParkMap(parkId)]);
      setParkDetail(d); setTrails(t); setParkMap(m);
    } catch (err) { fail(err); }
  }
  async function startRecording() {
    setError("");
    if (!adult || !rights || !external) { setError("Confirma los tres permisos para grabar."); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const chunks: Float32Array[] = [];
      processor.onaudioprocess = (e) => chunks.push(new Float32Array(e.inputBuffer.getChannelData(0)));
      source.connect(processor); processor.connect(context.destination);
      const cleanup = () => { processor.disconnect(); source.disconnect(); stream.getTracks().forEach((t) => t.stop()); };
      mediaRef.current = {
        stop: () => {
          cleanup(); const rate = context.sampleRate; void context.close();
          const total = chunks.reduce((n, c) => n + c.length, 0);
          const merged = new Float32Array(total); let off = 0;
          chunks.forEach((c) => { merged.set(c, off); off += c.length; });
          void sendTranscription(encodeWavPcm16(resampleTo16k(merged, rate)));
        },
        cancel: () => { cleanup(); void context.close(); },
      };
      setRecordSeconds(0); setPhase("grabando");
    } catch { setError("No se pudo usar el microfono. Escribe tu pregunta."); setPhase("inicial"); }
  }
  async function sendTranscription(wav: Blob) {
    setPhase("transcribiendo");
    const c = new AbortController(); abortRef.current = c;
    try {
      const r = await transcribeWav(wav, { token, languageHint: hint, signal: c.signal });
      setTranscript(r.transcript); setQuestion(r.transcript);
      if (r.provider === "mock") setError("Modo mock: el backend no transcribio audio real. Escribe o corrige el texto y continua.");
      setPhase("revision");
    } catch (err) { if (c.signal.aborted) setPhase("cancelado"); else fail(err); }
  }
  async function askWilo(text: string) {
    const clean = text.trim();
    if (!clean) { setError("Escribe una pregunta para Wilo."); return; }
    if (!adult || !external) { setError("Confirma mayoria de edad y procesamiento externo."); return; }
    setError(""); setRetryAfter(undefined); setElapsed(0); setPhase("consultando");
    const c = new AbortController(); abortRef.current = c;
    try {
      const result = await queryGuide(clean, { token, signal: c.signal });
      setHistory((h) => [...h, { question: clean, answer: result }]);
      setPhase(result.insufficient_evidence || result.provider === "mock" ? "insuficiente" : "respuesta");
      const parkId = result.entities.find((e) => e.type === "park")?.id || result.map?.park_id;
      if (parkId) void loadPark(parkId);
    } catch (err) { if (c.signal.aborted) setPhase("cancelado"); else fail(err); }
  }
  function cancelAll() {
    abortRef.current?.abort();
    window.speechSynthesis?.cancel(); setSpeaking(false);
    mediaRef.current?.cancel(); mediaRef.current = null;
    setPhase("cancelado");
  }
  function speak(text: string) {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.onend = () => setSpeaking(false); u.onerror = () => setSpeaking(false);
    setSpeaking(true); window.speechSynthesis.speak(u);
  }
  const live = phase === "grabando" ? `Grabando: ${recordSeconds} de 60 segundos.`
    : phase === "transcribiendo" ? "Transcribiendo tu audio…"
    : phase === "revision" ? "Transcripcion lista. Revisa y corrige antes de preguntar."
    : phase === "consultando" ? `Consultando Atlas y esperando a Wilo: ${elapsed} s. Lo real tardo 20–37 s.`
    : phase === "cancelado" ? "Operacion cancelada. Tu texto se conserva."
    : "Wilo listo. Escribe o graba tu pregunta.";
  const last = history[history.length - 1];

  return (
    <div className="lab-grid">
      <section className="card" aria-label="Habla con Wilo">
        <p className="kicker">MODULO A · WILO</p>
        <h2>Habla con Wilo</h2>
        <p className="live" role="status" aria-live="polite">{live}</p>
        <label>Idioma de la voz
          <select value={hint} onChange={(e) => setHint(e.target.value as LanguageHint)} aria-label="Idioma de la voz">
            <option value="auto">Automatico</option><option value="es">Espanol</option>
            <option value="en">English</option><option value="mixed">Mixto (es + en)</option>
          </select>
        </label>
        <fieldset><legend>Permisos necesarios</legend>
          <label className="check"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} /> Soy mayor de 18 anos.</label>
          <label className="check"><input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} /> Tengo derecho a usar mi voz.</label>
          <label className="check"><input type="checkbox" checked={external} onChange={(e) => setExternal(e.target.checked)} /> Acepto que el backend envie audio y pregunta a Meta.</label>
        </fieldset>
        <div className="chips">{PRESETS.map((p) => (
          <button key={p.id} type="button" className="chip" onClick={() => { setQuestion(p.question); setHint(p.hint); }}>{p.label}</button>
        ))}</div>
        <label>Tu pregunta (texto siempre disponible)
          <textarea rows={3} maxLength={2000} value={question} onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ej.: ¿Qué senderos hay en el Parque Nacional Puyehue?" aria-label="Tu pregunta (texto siempre disponible)" />
        </label>
        {phase === "grabando" ? (
          <div className="row">
            <button type="button" className="btn" onClick={() => mediaRef.current?.stop()}>Detener y transcribir ({recordSeconds}s / 60s)</button>
            <button type="button" className="btn alt" onClick={cancelAll}>Cancelar grabacion</button>
          </div>
        ) : (
          <div className="row">
            <button type="button" className="btn" onClick={() => void askWilo(question)} disabled={phase === "consultando" || phase === "transcribiendo"}>Preguntar a Wilo</button>
            <button type="button" className="btn alt" onClick={() => void startRecording()} disabled={phase === "consultando" || phase === "transcribiendo"}>Grabar en WAV 16 kHz</button>
          </div>
        )}
        {(phase === "transcribiendo" || phase === "consultando") && (
          <div className="notice" role="status"><strong>{phase === "transcribiendo" ? "Transcribiendo…" : elapsed < 8 ? "Consultando Atlas…" : "Wilo esta pensando…"}</strong>
            <p>{phase === "consultando" ? `Van ${elapsed} s. Spark tardo 20–37 s el 03-11.` : "La transcripcion suele tardar 2–3 s. Solo WAV PCM16 mono."}</p>
            <button type="button" className="btn alt" onClick={cancelAll}>Cancelar</button></div>
        )}
        {phase === "revision" && (
          <div>
            <label>Transcripcion editable: corrige nombres antes de enviar
              <textarea rows={3} maxLength={2000} value={transcript} onChange={(e) => { setTranscript(e.target.value); setQuestion(e.target.value); }} aria-label="Transcripcion editable: corrige nombres antes de enviar" />
            </label>
            <p className="small">Errores reales de ASR: trails → trees, Queulat → Chiloé, Wilo → Willow. Nada se envia hasta confirmar.</p>
            <div className="row">
              <button type="button" className="btn" onClick={() => void askWilo(transcript)}>Confirmar y preguntar</button>
              <button type="button" className="btn alt" onClick={() => setPhase("inicial")}>Volver</button>
            </div>
          </div>
        )}
        {error && <p className="notice err" role="alert">{error}{retryAfter ? ` Reintenta en ${retryAfter} s, solo cuando tu lo pidas.` : ""}</p>}
        {phase === "sin-acceso" && <p className="notice" role="status">Pide acceso a la demo: /guide/* exige token de DEMO_TOKENS.</p>}
        {history.length > 0 && (
          <section aria-label="Historial de la conversacion"><h3>Historial de esta sesion</h3>
            <ol className="history">{history.map((turn, i) => (
              <li key={i}><p className="q">{turn.question}</p>
                <p><span className="tag">{turn.answer.provider === "mock" ? "Modo mock: sin inferencia real" : `Meta · ${turn.answer.model ?? "muse-spark-1.3"}`}</span>{" "}
                <span className="tag">{turn.answer.insufficient_evidence ? "Evidencia insuficiente" : "Respuesta lista"}</span></p>
                <p>{turn.answer.answer}</p>
                {turn.answer.limitations.length > 0 && <p className="small">Limites: {turn.answer.limitations.join(" ")}</p>}
              </li>))}
            </ol>
            {last && typeof window !== "undefined" && "speechSynthesis" in window && (
              <button type="button" className="btn alt" onClick={() => speaking ? cancelAll() : speak(last.answer.speech_text || last.answer.answer)}>
                {speaking ? "Detener lectura" : "Escuchar ultima respuesta"}</button>
            )}
          </section>
        )}
        {last && (
          <article aria-label="Respuesta de Wilo">
            {last.answer.sources.length > 0 && (<><h3>Fuentes consultadas</h3>
              <ul className="list">{last.answer.sources.map((s, i) => <li key={i}>{s.url ? <a href={s.url} target="_blank" rel="noreferrer">{s.title || s.id || s.url} ↗</a> : (s.title || s.id)} <span className="tag">{s.type ?? "fuente"}</span></li>)}</ul></>)}
            {last.answer.entities.length > 0 && (<><h3>Fichas vinculadas</h3>
              <div className="chips">{last.answer.entities.map((e) => <button key={`${e.type}-${e.id}`} type="button" className="chip" onClick={() => { if (e.type === "park") void loadPark(e.id); }}>{e.type}: {e.id}</button>)}</div></>)}
            <p className="small">Conocimiento: {last.answer.knowledge_version ?? "—"} · Herramientas: {last.answer.tools_used.join(", ") || "ninguna"}</p>
          </article>
        )}
      </section>
      <aside className="card" aria-label="Atlas de parques y senderos">
        <p className="kicker">KNOWLEDGE ATLAS · SIN TOKEN</p>
        <h2>Parques, senderos y taxones</h2>
        <p className="small" role="status">{atlasNote}</p>
        <form onSubmit={(e) => { e.preventDefault(); void fetchParks(parkQuery).then((r) => setParks(r.items)).catch(fail); }}>
          <label>Buscar parque<input type="search" value={parkQuery} onChange={(e) => setParkQuery(e.target.value)} placeholder="Puyehue, Conguillio…" aria-label="Buscar parque" /></label>
          <button className="btn alt" type="submit">Buscar</button>
        </form>
        <div className="chips">{parks.map((p) => <button key={p.id} type="button" className="chip" onClick={() => void loadPark(p.id)}>{p.name} · {p.trail_count} senderos</button>)}</div>
        {parkDetail && <p><strong>{parkDetail.name}</strong>{parkDetail.area_ha ? ` · ${parkDetail.area_ha.toLocaleString("es-CL")} ha (CONAF)` : ""} · <a href={parkDetail.official_url} target="_blank" rel="noreferrer">Ficha oficial ↗</a></p>}
        {parkMap && <ParkMap bbox={parkMap.bbox} parkName={parkDetail?.name ?? parkMap.park_id} />}
        {trails.length > 0 && (<><h3>Senderos documentados</h3>
          <ul className="list">{trails.map((t) => <li key={t.id}><strong>{t.name}</strong> <span className="tag">{sourceLabel(t.source_status)}</span> <span className="small">{t.distance_m ? `${t.distance_m} m` : "sin distancia"} · {openingLabel(t)}</span></li>)}</ul>
          <p className="small">Sin trazados GPS. not_verified nunca significa abierto.</p></>)}
      </aside>
    </div>
  );
}
