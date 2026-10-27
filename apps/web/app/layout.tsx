import type { Metadata } from "next";
import Link from "next/link";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { Navigation } from "@/components/navigation";
import { Icon } from "@/components/icon";

export const metadata: Metadata = {
  title: { default: "Bosque Vivo Chile · Conoce el bosque que te rodea", template: "%s · Bosque Vivo Chile" },
  description: "Una base abierta de inteligencia botánica y territorial de ProGarLabs. Piloto en el entorno del Parque Nacional Puyehue.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="es"><body><a className="skip-link" href="#main">Saltar al contenido</a><Navigation /><main id="main">{children}</main><footer className="site-footer"><div className="footer-brand"><Icon name="leaf" /><span>Bosque Vivo Chile <small>Una iniciativa de ProGarLabs · Osorno, Chile</small></span></div><p>Conocer para cuidar.</p><Link href="/proyecto">Prototipo abierto · estado del proyecto ↗</Link></footer></body></html>;
}
