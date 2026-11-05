import { useState } from "react";
import { DemoStatus } from "./components/DemoStatus";
import { FederatedLogin } from "./components/FederatedLogin";
import { SessionPanel } from "./components/SessionPanel";
import { SpeciesLab } from "./components/SpeciesLab";
import { WiloChat } from "./components/WiloChat";

type View = "inicio" | "wilo" | "especies";

export default function App() {
  const [view, setView] = useState<View>("inicio");
  const [savedToken] = useState(() => {
    try { return sessionStorage.getItem("wilo-lab-token"); }
    catch { return null; }
  });
  const [token, setToken] = useState(savedToken ?? "");
  const [remember, setRemember] = useState(savedToken !== null);

  function saveToken(value: string, keep: boolean) {
    setToken(value); setRemember(keep);
    try {
      if (keep) sessionStorage.setItem("wilo-lab-token", value);
      else sessionStorage.removeItem("wilo-lab-token");
    } catch { /* solo memoria */ }
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div className="brand"><span className="mark">BV</span><span>Bosque Vivo · Wilo Lab<small>EXPERIMENTAL DEMO CLIENT · REAL META AI · NOT THE OFFICIAL APP</small></span></div>
        <nav aria-label="Modulos del laboratorio">
          <button type="button" className={view === "inicio" ? "nav on" : "nav"} onClick={() => setView("inicio")}>Inicio</button>
          <button type="button" className={view === "wilo" ? "nav on" : "nav"} onClick={() => setView("wilo")}>Habla con Wilo</button>
          <button type="button" className={view === "especies" ? "nav on" : "nav"} onClick={() => setView("especies")}>Explora una especie</button>
        </nav>
      </header>
      <main>
        {view === "inicio" && (
          <>
            <section className="hero">
              <p className="kicker">BOSQUE VIVO CHILE · LABORATORIO</p>
              <h1>Explore Chile's parks with AI that knows what it cannot verify.</h1>
              <p>App independiente del frontend oficial: conversa con Wilo por voz o texto y prueba el reconocimiento
                visual de especies contra las APIs reales. En modo mock todo se etiqueta como mock.</p>
              <DemoStatus />
              <p className="small">Sesion opcional, solo para evaluadores con invitacion:</p>
              <SessionPanel token={token} onToken={(value) => saveToken(value, remember)} />
              <FederatedLogin token={token} onToken={(value) => saveToken(value, remember)} />
              <label className="token">Token del backend: sesion temporal bvs_ (nunca la clave Meta)
                <input type="password" autoComplete="off" value={token} onChange={(e) => saveToken(e.target.value, remember)}
                  placeholder="Opcional mientras la demo publica este activa" aria-label="Token demo del backend" />
              </label>
              <label className="check"><input type="checkbox" checked={remember} onChange={(e) => saveToken(token, e.target.checked)} /> Recordar solo en esta sesion</label>
            </section>
            <section className="choices">
              <button type="button" className="choice" onClick={() => setView("wilo")}>
                <span className="kicker">MODULO A</span><strong>Habla con Wilo</strong>
                <span>Voz WAV, transcripcion corregible, respuestas con fuentes del Atlas e historial de sesion.</span>
              </button>
              <button type="button" className="choice" onClick={() => setView("especies")}>
                <span className="kicker">MODULO B</span><strong>Explora una especie</strong>
                <span>Foto de un arbol, candidatos con evidencia y abstencion honesta fuera del catalogo de 8 especies.</span>
              </button>
            </section>
          </>
        )}
        {view === "wilo" && <WiloChat token={token} />}
        {view === "especies" && <SpeciesLab token={token} />}
      </main>
      <footer className="footer">Wilo Lab · ProGarLabs · Sin credenciales Meta en el navegador · La API oficial de Bosque Vivo no se modifica desde aqui.</footer>
    </div>
  );
}
