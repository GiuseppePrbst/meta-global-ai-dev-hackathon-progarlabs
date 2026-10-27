"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "./icon";

const links = [["/", "Inicio"], ["/atlas", "Atlas"], ["/especies", "Especies"], ["/proyecto", "El proyecto"]];

export function Navigation() {
  const pathname = usePathname();
  return <header className="site-header">
    <div className="header-inner">
      <Link href="/" className="brand" aria-label="Bosque Vivo Chile, inicio"><span className="brand-mark"><Icon name="leaf" /></span><span>Bosque Vivo<span className="brand-country">CHILE · POR PROGARLABS</span></span></Link>
      <nav aria-label="Navegación principal">{links.map(([href, label]) => <Link key={href} href={href} aria-current={pathname === href ? "page" : undefined}>{label}</Link>)}</nav>
      <Link href="/identificar" className="button button-small"><Icon name="camera" /> Identificar</Link>
    </div>
  </header>;
}
