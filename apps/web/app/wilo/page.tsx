import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { WiloGuide } from "@/components/wilo-guide";

export const metadata: Metadata = { title: "Wilo, guia del bosque" };

export default function WiloPage() {
  return (
    <div className="page-shell">
      <PageHeading eyebrow="WILO · VOZ Y TEXTO BILINGUE" title="Preguntale al bosque, con fuentes.">
        Wilo transcribe tu voz, te deja corregir el texto y responde solo desde el Knowledge Atlas de Bosque Vivo.
        En modo mock lo dice explicitamente: ninguna respuesta simulada se presenta como real.
      </PageHeading>
      <WiloGuide />
    </div>
  );
}
