"use client";

import { useEffect, useRef, useState } from "react";
import {
  encodeWavPcm16,
  fetchKnowledgeStatus,
  fetchPark,
  fetchParkMap,
  fetchParkTrails,
  fetchParks,
  fetchTaxaDemo,
  openingLabel,
  queryGuide,
  resampleTo16k,
  sourceLabel,
  transcribeWav,
  WiloError,
  type GuideAnswer,
  type LanguageHint,
  type ParkMap,
  type Trail,
} from "@/lib/wilo";
import { Icon } from "./icon";
import { WiloMap } from "./wilo-map";

type Phase =
  | "inicial" | "grabando" | "transcribiendo" | "revision"
  | "consultando" | "respuesta" | "insuficiente"
  | "error-proveedor" | "limite" | "cancelado" | "sin-acceso";

const PRESETS: { id: string; label: string; question: string; hint: LanguageHint }[] = [
  { id: "A", label: "A · Puyehue", question: "¿Qué senderos hay en el Parque Nacional Puyehue?", hint: "es" },
  { id: "B", label: "B · Anticura", question: "¿Qué senderos hay en el sector Anticura del Parque Nacional Puyehue?", hint: "es" },
  { id: "C", label: "C · Biodiversidad", question: "¿Qué es el coigüe y cómo se diferencia del ulmo?", hint: "es" },
  { id: "D", label: "D · English", question: "What trails are in Puyehue National Park? Please answer in English.", hint: "en" },
];

export function WiloGuide() {
  const [phase, setPhase] = useState<Phase>("inicial");
  const [token, setToken] = useState("");
  const [remember, setRemember] = useState(false);
  const [hint, setHint] = useState<LanguageHint>("auto");
  const [adult, setAdult] = useState(false);
  const [rights, setRights] = useState(false);
  const [external, setExternal] = useState(false);
  const [question, setQuestion] = useState("");
  const [transcript, setTranscript] = useState("");
  const [answer, setAnswer] = useState<GuideAnswer | null>(null);
  const [error, setError] = useState("");
  const [retryAfter, setRetryAfter] = useState<number | undefined>();
  const [elapsed, setElapsed] = useState(0);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [speaking, setSpeaking] = useState(false);

  const [parks, setParks] = useState<{ id: string; name: string; trail_count: number }[]>([]);
  const [parkQuery, setParkQuery] = useState("");
  const [parkDetail, setParkDetail] = useState<{ name: string; area_ha: number | null; official_url: string } | null>(null);
  const [trails, setTrails] = useState<Trail[]>([]);
  const [parkMap, setParkMap] = useState<ParkMap | null>(null);
  const [taxa, setTaxa] = useState<{ id: string; common_names: string[]; scientific_name: string }[]>([]);
  const [atlasNote, setAtlasNote] = useState("Cargando Atlas…");

  const abortRef = useRef<AbortController | null>(null);
  const mediaRef = useRef<{ stop: () => void; cancel: () => void } | null>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // sessionStorage es un sistema externo al render: se lee tras montar.
    queueMicrotask(() => {
      try {
        const saved = sessionStorage.getItem("bosque-vivo-wilo-token");
        if (saved) { setToken(saved); setRemember(true); }
      } catch { /* memoria solamente */ }
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    Promise.all([fetchParks("", controller.signal), fetchTaxaDemo(controller.signal), fetchKnowledgeStatus(controller.signal)])
      .then(([parkPage, taxaPage, status]) => {
        setParks(parkPage.items);
        setTaxa(taxaPage.items.slice(0, 6));
        setAtlasNote(`Atlas vigente: ${status.counts.Park ?? 46} parques · ${status.counts.Trail ?? 199} senderos · ${status.counts.Taxon ?? 20} taxones. Sin trazados GPS.`);
      })
      .catch(() => { if (!controller.signal.aborted) setAtlasNote("Atlas no disponible. Revisa que la API este en http://localhost:8000."); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (phase !== "consultando") return;
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "grabando") return;
    const timer = setInterval(() => setRecordSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, [phase]);

  function saveToken(value: string, keep: boolean) {
    setToken(value);
    setRemember(keep);
    try {
      if (keep) sessionStorage.setItem("bosque-vivo-wilo-token", value);
      else sessionStorage.removeItem("bosque-vivo-wilo-token");
    } catch { /* sin persistencia disponible */ }
  }

  function fail(err: unknown) {
    if (err instanceof WiloError) {
      setError(err.message);
      setRetryAfter(err.retryAfter);
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
      const [detail, parkTrails, map] = await Promise.all([fetchPark(parkId), fetchParkTrails(parkId), fetchParkMap(parkId)]);
      setParkDetail(detail);
      setTrails(parkTrails);
      setParkMap(map);
    } catch (err) { fail(err); }
  }

  async function searchParks(event: React.FormEvent) {
    event.preventDefault();
    try { setParks((await fetchParks(parkQuery)).items); } catch (err) { fail(err); }
  }

  async function startRecording() {
    setError("");
    if (!adult || !rights || !external) {
      setError("Confirma los tres permisos para grabar: mayoria de edad, derechos sobre tu voz y procesamiento externo desde el backend.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const processor = context.createScriptProcessor(4096, 1, 1);
      const chunks: Float32Array[] = [];
      processor.onaudioprocess = (event) => chunks.push(new Float32Array(event.inputBuffer.getChannelData(0)));
      source.connect(processor);
      processor.connect(context.destination);
      const cleanup = () => {
        processor.disconnect();
        source.disconnect();
        stream.getTracks().forEach((track) => track.stop());
      };
      mediaRef.current = {
        stop: () => {
          cleanup();
          const rate = context.sampleRate;
          void context.close();
          const total = chunks.reduce((n, c) => n + c.length, 0);
          const merged = new Float32Array(total);
          let offset = 0;
          chunks.forEach((c) => { merged.set(c, offset); offset += c.length; });
          const wav = encodeWavPcm16(resampleTo16k(merged, rate));
          void sendTranscription(wav);
        },
        cancel: () => {
          cleanup();
          void context.close();
        },
      };
      setRecordSeconds(0);
      setPhase("grabando");
    } catch {
      setError("No se pudo usar el microfono. Puedes escribir tu pregunta; el texto siempre esta disponible.");
      setPhase("inicial");
    }
  }

  function cancelRecording() {
    mediaRef.current?.cancel();
    mediaRef.current = null;
    setPhase("cancelado");
  }

  async function sendTranscription(wav: Blob) {
    setPhase("transcribiendo");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await transcribeWav(wav, { token, languageHint: hint, signal: controller.signal });
      setTranscript(result.transcript);
      setQuestion(result.transcript);
      if (result.provider === "mock") {
        setError("Modo mock: el backend no transcribio audio real. Escribe o corrige el texto y continua.");
      }
      setPhase("revision");
    } catch (err) {
      if (controller.signal.aborted) setPhase("cancelado");
      else fail(err);
    }
  }

  async function askWilo(text: string) {
    const clean = text.trim();
    if (!clean) { setError("Escribe una pregunta para Wilo."); return; }
    if (!adult || !external) { setError("Confirma mayoria de edad y procesamiento externo para consultar a Wilo."); return; }
    setError("");
    setRetryAfter(undefined);
    setElapsed(0);
    setPhase("consultando");
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const result = await queryGuide(clean, { token, signal: controller.signal });
      setAnswer(result);
      setPhase(result.insufficient_evidence || result.provider === "mock" ? "insuficiente" : "respuesta");
      const parkEntity = result.entities.find((e) => e.type === "park");
      const parkId = parkEntity?.id || result.map?.park_id;
      if (parkId) void loadPark(parkId);
    } catch (err) {
      if (controller.signal.aborted) setPhase("cancelado");
      else fail(err);
    }
  }

  function cancelRequest() {
    abortRef.current?.abort();
    window.speechSynthesis?.cancel();
    setSpeaking(false);
    setPhase("cancelado");
  }

  function speakAnswer() {
    if (!answer || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(answer.speech_text || answer.answer);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    setSpeaking(true);
    window.speechSynthesis.speak(utterance);
  }

  const liveText =
    phase === "grabando" ? `Grabando: ${recordSeconds} de 60 segundos. Pulsa Detener o Cancelar.`
    : phase === "transcribiendo" ? "Transcribiendo tu audio…"
    : phase === "revision" ? "Transcripcion lista. Revisa y corrige el texto antes de preguntar."
    : phase === "consultando" ? `Consultando el Atlas y esperando a Wilo: ${elapsed} segundos. Las respuestas reales tardaron 20 a 37 segundos.`
    : phase === "respuesta" ? "Respuesta de Wilo lista."
    : phase === "insuficiente" ? "Wilo no tiene evidencia suficiente o el backend esta en modo mock."
    : phase === "limite" ? "Limite de consumo alcanzado."
    : phase === "sin-acceso" ? "Falta acceso a la demo."
    : phase === "cancelado" ? "Operacion cancelada. Tu texto se conserva."
    : phase === "error-proveedor" ? "El proveedor no esta disponible."
    : "Wilo esta listo. Escribe o graba tu pregunta.";

  return (
    <div className="wilo-grid">
      <section className="panel wilo-panel" aria-label="Wilo, guia por voz y texto">
        <p className="eyebrow">WILO · GUIA DEL ATLAS</p>
        <h2>Pregunta por un parque, un sendero o una especie</h2>
        <p ref={liveRef} className="wilo-live" role="status" aria-live="polite">{liveText}</p>

        <label htmlFor="wilo-token">Token de demo (solo backend, nunca la clave Meta)
          <input id="wilo-token" type="password" autoComplete="off" value={token}
            onChange={(e) => saveToken(e.target.value, remember)} placeholder="Pega tu token demo de /guide/*" />
        </label>
        <label className="checkbox"><input type="checkbox" checked={remember} onChange={(e) => saveToken(token, e.target.checked)} />
          Recordar el token solo en esta sesion del navegador</label>

        <label htmlFor="wilo-lang">Idioma de la voz
          <select id="wilo-lang" value={hint} onChange={(e) => setHint(e.target.value as LanguageHint)}>
            <option value="auto">Automatico</option>
            <option value="es">Espanol</option>
            <option value="en">English</option>
            <option value="mixed">Mixto (es + en)</option>
          </select>
        </label>

        <fieldset className="wilo-permissions">
          <legend>Permisos necesarios</legend>
          <label className="checkbox"><input type="checkbox" checked={adult} onChange={(e) => setAdult(e.target.checked)} /> Soy mayor de 18 anos.</label>
          <label className="checkbox"><input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} /> Tengo derecho a usar mi voz en esta grabacion.</label>
          <label className="checkbox"><input type="checkbox" checked={external} onChange={(e) => setExternal(e.target.checked)} /> Acepto que el backend envie mi audio y mi pregunta a Meta para transcribir y responder.</label>
          <p className="small muted">El microfono solo se activa al pulsar Grabar. Sin microfono o sin red, escribe tu pregunta.</p>
        </fieldset>

        <div className="wilo-presets" aria-label="Recorridos de demostracion">
          {PRESETS.map((preset) => (
            <button key={preset.id} type="button" className="wilo-chip"
              onClick={() => { setQuestion(preset.question); setTranscript(""); setHint(preset.hint); }}>
              {preset.label}
            </button>
          ))}
        </div>

        <label htmlFor="wilo-question">Tu pregunta (texto siempre disponible)
          <textarea id="wilo-question" rows={3} maxLength={2000} value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ej.: ¿Qué senderos hay en el Parque Nacional Puyehue?" />
        </label>

        {phase === "grabando" ? (
          <div className="button-row">
            <button type="button" className="button" onClick={() => mediaRef.current?.stop()}>
              <Icon name="stop" /> Detener y transcribir ({recordSeconds}s / 60s)
            </button>
            <button type="button" className="button button-secondary" onClick={cancelRecording}>Cancelar grabacion</button>
          </div>
        ) : (
          <div className="button-row">
            <button type="button" className="button" onClick={() => void askWilo(question)} disabled={phase === "consultando" || phase === "transcribiendo"}>
              Preguntar a Wilo
            </button>
            <button type="button" className="button button-secondary" onClick={() => void startRecording()} disabled={phase === "consultando" || phase === "transcribiendo"}>
              <Icon name="mic" /> Grabar en WAV 16 kHz
            </button>
          </div>
        )}

        {(phase === "transcribiendo" || phase === "consultando") && (
          <div className="notice" role="status">
            <strong>{phase === "transcribiendo" ? "Transcribiendo…" : elapsed < 8 ? "Consultando Atlas…" : "Wilo esta pensando…"}</strong>
            <p>{phase === "consultando"
              ? `Van ${elapsed} s. Una respuesta real de Spark tardo 20–37 s el 03-11; el Atlas responde en milisegundos y la espera es la generacion.`
              : "La transcripcion suele tardar 2–3 s. Tu audio viaja como WAV PCM16 mono, el unico formato aceptado."}</p>
            <button type="button" className="button button-secondary" onClick={cancelRequest}>Cancelar</button>
          </div>
        )}

        {phase === "revision" && (
          <div className="wilo-review">
            <label htmlFor="wilo-transcript">Transcripcion editable: corrige nombres antes de enviar
              <textarea id="wilo-transcript" rows={3} maxLength={2000} value={transcript}
                onChange={(e) => { setTranscript(e.target.value); setQuestion(e.target.value); }} />
            </label>
            <p className="small muted">Errores reales de ASR: trails → trees, Queulat → Chiloé, Wilo → Willow. Corrige aqui; nada se envia hasta que confirmes.</p>
            <div className="button-row">
              <button type="button" className="button" onClick={() => void askWilo(transcript)}>Confirmar y preguntar</button>
              <button type="button" className="button button-secondary" onClick={() => setPhase("inicial")}>Volver a grabar o escribir</button>
            </div>
          </div>
        )}

        {error && <p className="notice notice-error" role="alert">{error}{retryAfter ? ` Reintenta en ${retryAfter} s, solo cuando tu lo pidas.` : ""}</p>}
        {phase === "sin-acceso" && <p className="notice" role="status">Pide acceso a la demo: /guide/* exige un token individual de DEMO_TOKENS del backend.</p>}

        {answer && (phase === "respuesta" || phase === "insuficiente") && (
          <article className="wilo-answer" aria-label="Respuesta de Wilo">
            <div className="wilo-badges">
              <span className="tag">{answer.provider === "mock" ? "Modo mock: sin inferencia real" : `Meta · ${answer.model ?? "muse-spark-1.3"}`}</span>
              <span className="tag">{phase === "insuficiente" ? "Evidencia insuficiente" : "Respuesta lista"}</span>
            </div>
            <p className="wilo-answer-text">{answer.answer}</p>
            {typeof window !== "undefined" && "speechSynthesis" in window && (
              <button type="button" className="button button-secondary" onClick={speaking ? cancelRequest : speakAnswer}>
                {speaking ? "Detener lectura" : "Escuchar con la voz del dispositivo"}
              </button>
            )}
            {answer.limitations.length > 0 && (
              <div className="notice"><strong>Limitaciones</strong>{answer.limitations.map((item) => <p key={item}>{item}</p>)}</div>
            )}
            {answer.sources.length > 0 && (
              <section aria-label="Fuentes consultadas"><h3>Fuentes consultadas</h3>
                <ul className="wilo-sources">{answer.sources.map((source, i) => (
                  <li key={`${source.id ?? i}`}>{source.url
                    ? <a className="inline-link" href={source.url} target="_blank" rel="noreferrer">{source.title || source.id || source.url} ↗</a>
                    : (source.title || source.id)} <span className="tag">{source.type ?? source.confidence ?? "fuente"}</span></li>
                ))}</ul>
              </section>
            )}
            {answer.entities.length > 0 && (
              <section aria-label="Entidades reconocidas"><h3>Fichas vinculadas</h3>
                <div className="wilo-presets">{answer.entities.map((entity) => (
                  <button key={`${entity.type}-${entity.id}`} type="button" className="wilo-chip"
                    onClick={() => { if (entity.type === "park") void loadPark(entity.id); }}>
                    {entity.type}: {entity.id}
                  </button>
                ))}</div>
              </section>
            )}
            <p className="small muted">Version de conocimiento: {answer.knowledge_version ?? "—"} · Herramientas: {answer.tools_used.join(", ") || "ninguna"}</p>
          </article>
        )}
      </section>

      <aside className="panel wilo-atlas" aria-label="Atlas de parques y senderos">
        <p className="eyebrow">KNOWLEDGE ATLAS · SIN TOKEN</p>
        <h2>Parques, senderos y taxones</h2>
        <p className="small" role="status">{atlasNote}</p>
        <form onSubmit={searchParks}>
          <label htmlFor="wilo-park-search">Buscar parque
            <input id="wilo-park-search" type="search" value={parkQuery} onChange={(e) => setParkQuery(e.target.value)} placeholder="Puyehue, Conguillio…" />
          </label>
          <button className="button button-secondary" type="submit">Buscar</button>
        </form>
        <div className="wilo-presets">
          {parks.map((park) => (
            <button key={park.id} type="button" className="wilo-chip" onClick={() => void loadPark(park.id)}>
              {park.name} · {park.trail_count} senderos
            </button>
          ))}
        </div>
        {parkDetail && <p><strong>{parkDetail.name}</strong>{parkDetail.area_ha ? ` · ${parkDetail.area_ha.toLocaleString("es-CL")} ha (CONAF)` : ""} · <a className="inline-link" href={parkDetail.official_url} target="_blank" rel="noreferrer">Ficha oficial ↗</a></p>}
        {parkMap && <WiloMap bbox={parkMap.bbox} parkName={parkDetail?.name ?? parkMap.park_id} />}
        {trails.length > 0 && (
          <section aria-label="Senderos disponibles"><h3>Senderos documentados</h3>
            <ul className="wilo-trails">{trails.map((trail) => (
              <li key={trail.id}><strong>{trail.name}</strong> <span className="tag">{sourceLabel(trail.source_status)}</span>
                <span className="small muted"> {trail.distance_m ? `${trail.distance_m} m` : "sin distancia"} · {openingLabel(trail)}</span></li>
            ))}</ul>
            <p className="small muted">Sin trazados GPS: ningun sendero se dibuja ni se ofrece navegacion. not_verified nunca significa abierto.</p>
          </section>
        )}
        {taxa.length > 0 && (
          <section aria-label="Taxones listos para la demo"><h3>Biodiversidad lista para la demo</h3>
            <ul className="wilo-trails">{taxa.map((taxon) => (
              <li key={taxon.id}><strong>{taxon.common_names[0] ?? taxon.id}</strong> <i>{taxon.scientific_name}</i></li>
            ))}</ul>
          </section>
        )}
      </aside>
    </div>
  );
}
