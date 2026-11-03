"use client";

import { useEffect, useRef, useState } from "react";
import { isValidBbox } from "@/lib/wilo";
import { Icon } from "./icon";

// Solo encuadra el bbox BCN. Nunca dibuja poligonos de limite ni trazados de sendero:
// geometry_available es siempre false en el Atlas (docs/FRONTEND_HANDOFF.md, seccion F).
export function WiloMap({ bbox, parkName }: { bbox: number[] | null; parkName: string }) {
  const container = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState<string | null>(null);
  const status = !isValidBbox(bbox)
    ? "Sin encuadre cartografico para este parque. Consulta la ficha oficial de CONAF."
    : (loaded ?? "Cargando encuadre de referencia…");

  useEffect(() => {
    if (!isValidBbox(bbox)) return;
    let disposed = false;
    let map: import("maplibre-gl").Map | undefined;
    import("maplibre-gl")
      .then(({ Map, NavigationControl, ScaleControl }) => {
        if (disposed || !container.current) return;
        map = new Map({
          container: container.current,
          bounds: [
            [bbox[0], bbox[1]],
            [bbox[2], bbox[3]],
          ],
          fitBoundsOptions: { padding: 35 },
          style: {
            version: 8,
            sources: {
              osm: {
                type: "raster",
                tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
                tileSize: 256,
                attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
              },
            },
            layers: [{ id: "osm", type: "raster", source: "osm" }],
          },
        });
        map.addControl(new NavigationControl(), "top-right");
        map.addControl(new ScaleControl(), "bottom-left");
        map.on("load", () => setLoaded(`Encuadre de referencia de ${parkName}. No es el limite legal ni una ruta.`));
        map.on("error", () => setLoaded("No se pudo cargar el mapa base. La ficha y los senderos siguen disponibles."));
      })
      .catch(() => setLoaded("El mapa no esta disponible en este dispositivo. Consulta la ficha del parque."));
    return () => {
      disposed = true;
      map?.remove();
    };
  }, [bbox, parkName]);

  if (!isValidBbox(bbox)) {
    return (
      <div className="map-wrapper">
        <div className="wilo-map-empty" role="status">{status}</div>
      </div>
    );
  }
  return (
    <div className="map-wrapper">
      <div ref={container} className="atlas-map" role="region" aria-label={`Mapa de referencia del entorno de ${parkName}`} />
      <div className="map-caption"><Icon name="map" /><span role="status">{status}</span></div>
    </div>
  );
}
