"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./icon";

export function AtlasMap() {
  const container = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState("Cargando mapa…");
  useEffect(() => {
    let disposed = false;
    let map: import("maplibre-gl").Map | undefined;
    import("maplibre-gl").then(({ Map, NavigationControl, ScaleControl }) => {
      if (disposed || !container.current) return;
      map = new Map({
        container: container.current,
        // Encuadre del rango de coordenadas publicado por CONAF, no límites oficiales del parque.
        bounds: [[-(72 + 20 / 60), -(40 + 57 / 60)], [-(71 + 50 / 60), -(40 + 25 / 60)]],
        fitBoundsOptions: { padding: 35 },
        style: {
          version: 8,
          sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' } },
          layers: [{ id: "osm", type: "raster", source: "osm" }],
        },
      });
      map.addControl(new NavigationControl(), "top-right");
      map.addControl(new ScaleControl(), "bottom-left");
      map.on("load", () => setStatus("Mapa base listo. No hay observaciones verificadas ni límites oficiales cargados."));
      map.on("error", () => setStatus("No se pudo cargar parte del mapa. Revisa tu conexión; puedes seguir consultando las fichas."));
    }).catch(() => setStatus("El mapa no está disponible en este dispositivo. Consulta las fichas y las fuentes territoriales."));
    return () => { disposed = true; map?.remove(); };
  }, []);
  return <div className="map-wrapper"><div ref={container} className="atlas-map" role="region" aria-label="Mapa interactivo de referencia del entorno de Puyehue" /><div className="map-caption"><Icon name="map" /><span role="status">{status}</span></div></div>;
}
