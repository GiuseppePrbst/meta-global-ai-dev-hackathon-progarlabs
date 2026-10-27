import type { Metadata } from "next";
import { PageHeading } from "@/components/page-heading";
import { SpeciesCatalog } from "@/components/species-catalog";

export const metadata: Metadata = { title: "Catálogo de especies" };
export default function SpeciesPage() {
  return <div className="page-shell"><PageHeading eyebrow="CATÁLOGO BOTÁNICO · M01" title="Conoce a quienes forman el bosque.">Ocho especies candidatas para el piloto. Nombres sujetos a validación taxonómica; sin registros confirmados de ejemplares específicos.</PageHeading><SpeciesCatalog /></div>;
}
