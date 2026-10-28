import { Circle, ClipPath, Defs, G, Path, RadialGradient, Stop } from 'react-native-svg';

import { blobPath, seeded } from '@/ui/brush';

export { blobPath, seeded, seedOf } from '@/ui/brush';

// Acuarela dibujada en código: manchas irregulares por capas translúcidas. Donde dos veladuras se
// cruzan el color se oscurece, y el borde de cada mancha se marca como el pigmento que se seca en
// el filo del agua. Todo es determinista por `seed`: la misma mancha en cada render.

type Point = [number, number];

type WashProps = {
  seed: number;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  color: string;
  /** Densidad total de la mancha (0–1): se reparte entre las veladuras y el borde. */
  opacity?: number;
  wobble?: number;
  /** Puntitos de granulación del pigmento. */
  grain?: number;
  /** Número de veladuras; más capas, borde más difuso. */
  layers?: number;
};

/**
 * Mancha de acuarela, dentro de un `<Svg>`: muchas veladuras tenues, cada una deformada de nuevo,
 * de modo que el filo sangra y la densidad varía; encima, un degradado radial que oscurece hacia el
 * borde, donde el pigmento se acumula al secarse, y algo de granulación.
 */
export function Wash({ seed, cx, cy, rx, ry, color, opacity = 0.5, wobble = 0.14, grain = 0, layers = 8 }: WashProps) {
  const rand = seeded(seed + 7);
  const veils = Array.from({ length: layers }, (_, i) => {
    const shrink = 1 - (i / layers) * 0.28;
    const drift = 0.06 * (rand() - 0.5);
    return blobPath(seed + i * 31, cx + rx * drift, cy + ry * drift * 1.4, rx * shrink, ry * shrink, wobble * (1 + i * 0.06));
  });
  const outer = veils[0];
  const veilOpacity = (opacity * 1.4) / layers;
  const specks = Array.from({ length: grain }, () => {
    const a = rand() * Math.PI * 2;
    const r = 0.25 + Math.sqrt(rand()) * 0.65;
    return { x: cx + Math.cos(a) * rx * r, y: cy + Math.sin(a) * ry * r, s: 0.4 + rand() * 0.9 };
  });
  const dot = Math.max(rx, ry) * 0.018;
  const gradient = `wash-${seed}-${color.replace('#', '')}`;
  return (
    <G>
      <Defs>
        <RadialGradient id={gradient} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={0} />
          <Stop offset="0.7" stopColor={color} stopOpacity={opacity * 0.18} />
          <Stop offset="1" stopColor={color} stopOpacity={opacity * 0.65} />
        </RadialGradient>
      </Defs>
      {veils.map((d, i) => (
        <Path key={i} d={d} fill={color} fillOpacity={veilOpacity} />
      ))}
      <Path d={outer} fill={`url(#${gradient})`} />
      <Path d={outer} fill="none" stroke={color} strokeOpacity={opacity * 0.35} strokeWidth={dot * 0.9} strokeLinejoin="round" />
      {specks.map(({ x, y, s }, i) => (
        <Circle key={i} cx={x} cy={y} r={dot * s} fill={color} fillOpacity={opacity * 0.7} />
      ))}
    </G>
  );
}

/**
 * Borde inferior mojado de una banda de aguada de ancho `w` y alto `h`: el filo ondula en la franja
 * de `depth` inferior.
 */
export function bandPath(seed: number, w: number, h: number, depth: number) {
  const rand = seeded(seed);
  const steps = Math.max(8, Math.round(w / 36));
  const phase = rand() * Math.PI * 2;
  const edge: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * w;
    const wave = 0.5 + 0.3 * Math.sin((i / steps) * Math.PI * 2.3 + phase) + (rand() - 0.5) * 0.4;
    edge.push([x, h - depth + depth * Math.min(Math.max(wave, 0), 1)]);
  }
  // Curva por el filo, de derecha a izquierda; la banda cierra por arriba y el filo se traza aparte.
  const reversed = edge.slice().reverse();
  let curve = `M${reversed[0][0].toFixed(1)},${reversed[0][1].toFixed(1)}`;
  for (let i = 1; i < reversed.length; i++) {
    const [px, py] = reversed[i - 1];
    const [x, y] = reversed[i];
    curve += ` Q${px.toFixed(1)},${py.toFixed(1)} ${((px + x) / 2).toFixed(1)},${((py + y) / 2).toFixed(1)}`;
  }
  curve += ` L0,${reversed[reversed.length - 1][1].toFixed(1)}`;
  const d = `M0,0 L${w},0 L${curve.slice(1)} Z`;
  return { d, edge: curve };
}

/** Alto de la franja mojada bajo una banda: el contenido de abajo deja ese margen libre. */
export const BAND_EDGE = 18;

type PaintedBandProps = {
  seed: number;
  width: number;
  height: number;
  color: string;
  glaze: string;
  edge: string;
  /** Color del papel bajo el filo: el contenido que pasa por debajo no se transparenta. */
  paper: string;
};

/** Fondo de una barra superior pintado como banda de aguada, con veladuras y filo mojado. */
export function PaintedBand({ seed, width, height, color, glaze, edge, paper }: PaintedBandProps) {
  if (width <= 0 || height <= 0) return null;
  const band = bandPath(seed, width, height, BAND_EDGE);
  // Varias pasadas de la misma banda con filos distintos: donde no coinciden, el borde sangra.
  const bleeds = [1, 2, 3, 4].map((i) => bandPath(seed + i * 17, width, height, BAND_EDGE).d);
  const rand = seeded(seed + 3);
  return (
    <G>
      <Defs>
        <ClipPath id={`band-${seed}`}>
          <Path d={band.d} />
        </ClipPath>
      </Defs>
      {bleeds.map((d, i) => (
        <Path key={`paper-${i}`} d={d} fill={paper} />
      ))}
      {bleeds.map((d, i) => (
        <Path key={i} d={d} fill={color} fillOpacity={0.4} />
      ))}
      <Path d={band.d} fill={color} />
      {/* Las veladuras quedan dentro de la banda: bajo el filo solo sangra el color de la base. */}
      <G clipPath={`url(#band-${seed})`}>
        <Wash seed={seed + 11} cx={width * (0.72 + rand() * 0.1)} cy={height * 0.3} rx={width * 0.42} ry={height * 0.5}
          color={glaze} opacity={0.7} wobble={0.2} grain={18} />
        <Wash seed={seed + 23} cx={width * 0.08} cy={height * 0.75} rx={width * 0.3} ry={height * 0.32}
          color={glaze} opacity={0.5} wobble={0.22} />
        {/* Pigmento acumulado en el filo: un trazo ancho y tenue sobre otro fino. */}
        <Path d={band.edge} fill="none" stroke={edge} strokeWidth={9} strokeOpacity={0.28} strokeLinecap="round" />
        <Path d={band.edge} fill="none" stroke={edge} strokeWidth={3} strokeOpacity={0.45} strokeLinecap="round" />
      </G>
    </G>
  );
}
