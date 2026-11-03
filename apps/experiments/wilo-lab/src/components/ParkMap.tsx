import { useEffect, useRef, useState } from "react";
import { isValidBbox } from "../lib/wilo";
import "maplibre-gl/dist/maplibre-gl.css";

// Solo encuadra el bbox BCN. Nunca dibuja limites ni trazados: geometry_available=false.
export function ParkMap({ bbox, parkName }: { bbox: number[] | null; parkName: string }) {
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
          bounds: [[bbox[0], bbox[1]], [bbox[2], bbox[3]]],
          fitBoundsOptions: { padding: 35 },
          style: {
            version: 8,
            sources: { osm: { type: "raster", tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"], tileSize: 256, attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' } },
            layers: [{ id: "osm", type: "raster", source: "osm" }],
          },
        });
        map.addControl(new NavigationControl(), "top-right");
        map.addControl(new ScaleControl(), "bottom-left");
        map.on("load", () => setLoaded(`Encuadre de referencia de ${parkName}. No es el limite legal ni una ruta.`));
        map.on("error", () => setLoaded("No se pudo cargar el mapa base. La ficha y los senderos siguen disponibles."));
      })
      .catch(() => setLoaded("El mapa no esta disponible en este dispositivo."));
    return () => { disposed = true; map?.remove(); };
  }, [bbox, parkName]);

  if (!isValidBbox(bbox)) return <div className="map-box"><p role="status">{status}</p></div>;
  return (
    <div className="map-box">
      <div ref={container} className="map-canvas" role="region" aria-label={`Mapa de referencia del entorno de ${parkName}`} />
      <p className="map-caption" role="status">{status}</p>
    </div>
  );
}
