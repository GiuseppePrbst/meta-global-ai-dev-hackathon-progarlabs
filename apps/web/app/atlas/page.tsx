import type { Metadata } from "next";
import Link from "next/link";
import { PageHeading } from "@/components/page-heading";
import { AtlasMap } from "@/components/atlas-map";
import { ForestPanel } from "@/components/forest-panel";
import { Icon } from "@/components/icon";

export const metadata: Metadata = { title: "Atlas botánico" };
export default function AtlasPage() {
  return <div className="page-shell"><PageHeading eyebrow="ATLAS BOTÁNICO · M03 / M04" title="Cada árbol forma parte de algo mayor.">Explora el entorno de Puyehue y las fuentes que permitirán comprender su paisaje. Mapa base de referencia, sin observaciones verificadas cargadas.</PageHeading><div className="atlas-grid"><div><AtlasMap /><p className="small muted">Encuadre orientativo derivado del rango de coordenadas del <a href="https://www.conaf.cl/centro-documental/plan-de-manejo-del-pn-puyehue/" target="_blank" rel="noreferrer">plan de manejo de CONAF</a>. No representa los límites oficiales ni senderos habilitados.</p><section className="panel atlas-empty"><Icon name="tree" /><div><h2>El atlas espera sus primeras observaciones</h2><p>No hay árboles georreferenciados en esta versión. Puedes consultar el catálogo inicial y preparar un borrador de observación.</p><Link className="inline-link" href="/especies">Explorar especies candidatas →</Link></div></section></div><ForestPanel /></div><section className="panel territory-source"><p className="eyebrow">EXPLORACIÓN RESPONSABLE</p><h2>Antes de salir al bosque</h2><p>Los accesos, rutas y condiciones de visita requieren información actual de la autoridad administradora. Esta aplicación no ofrece navegación de senderos.</p><a href="https://www.conaf.cl/parque_nacionales/parque-nacional-puyehue/" className="inline-link" target="_blank" rel="noreferrer">Consultar la información oficial de Puyehue ↗</a></section></div>;
}
