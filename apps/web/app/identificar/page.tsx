import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { IdentifyForm } from "@/components/identify-form";

export const metadata: Metadata = { title: "Identificación botánica" };
export default function IdentifyPage() {
  return <div className="page-shell"><PageHeading eyebrow="DESCUBRIMIENTO BOTÁNICO · M02" title="Mira de cerca. Empieza a descubrir.">Prueba el flujo con una fotografía propia. La API utiliza un adaptador mock que se abstiene: aún no existe una identificación real con modelos Meta.</PageHeading><IdentifyForm /></div>;
}
