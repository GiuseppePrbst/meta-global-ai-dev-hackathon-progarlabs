import { useEffect } from 'react';
import { type EasingFunctionFactory, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { easeOutExpo, FadeGroup, InkPath, seedOf, seeded, useTheme, whenIdle } from '@/ui';

// Ilustración conceptual de la hoja de cada especie, dibujada en código como una página de
// cuaderno de campo: una aguada de color y, encima, la tinta fuera de registro.
// Es un esquema de la forma, no una representación fiel ni una fotografía.
// Vive fuera de `catalog/` porque la usan el catálogo, el Atlas e Identificar: ninguna feature
// depende del interior de otra.

type Margin = 'entire' | 'serrate' | 'crenate' | 'double-crenate';

type LeafShape = {
  length: number;
  width: number;
  /** <1 ensancha hacia la base (ovada), >1 hacia el ápice. */
  taper: number;
  /** <1 hombros llenos, >1 hoja más aguda. */
  fullness: number;
  margin: Margin;
  teeth?: number;
  depth?: number;
  dots?: boolean;
};

type Placement = { x: number; y: number; rotate: number; shape: LeafShape };

type Plate = { stem?: string; leaves: Placement[] };

/**
 * Contorno de la hoja desde la base (0,0) hacia el ápice, y su perímetro para el trazo animado.
 * `asym` estrecha o ensancha la mitad izquierda: a pulso, las dos mitades nunca salen iguales.
 */
function leafOutline({ length, width, taper, fullness, margin, teeth = 0, depth = 0 }: LeafShape, asym = 1) {
  const steps = 64;
  const right: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    let half = (width / 2) * Math.pow(Math.sin(Math.PI * Math.pow(s, taper)), fullness);
    if (margin !== 'entire' && teeth > 0) {
      const frac = (s * teeth) % 1;
      const window = Math.sin(Math.PI * s);
      let notch = margin === 'serrate' ? frac : 1 - Math.sin(Math.PI * frac);
      if (margin === 'double-crenate' && Math.floor(s * teeth) % 2 === 0) notch *= 0.35;
      half *= 1 - depth * notch * window;
    }
    right.push([half, -length * s]);
  }
  const left = right.slice().reverse().map(([x, y]) => [-x * asym, y] as [number, number]);
  const points = [...right, ...left];
  let perimeter = 0;
  for (let i = 1; i < points.length; i++) {
    perimeter += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return {
    d: `M${points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L')} Z`,
    perimeter: Math.ceil(perimeter) + 2,
  };
}

const sprig = 'M50 96 C 49 72, 52 48, 50 12';

function alternate(count: number, shape: LeafShape, spread = 58, from = 84, to = 22): Placement[] {
  return Array.from({ length: count }, (_, i) => {
    const y = from - ((from - to) * i) / Math.max(count - 1, 1);
    const side = i % 2 === 0 ? 1 : -1;
    const scale = 1 - (i / count) * 0.25;
    return {
      x: 50 + side * 0.5,
      y,
      rotate: side * (spread - i * 3),
      shape: { ...shape, length: shape.length * scale, width: shape.width * scale },
    };
  });
}

function opposite(pairs: number, shape: LeafShape, spread: number, from: number, to: number, tip = true): Placement[] {
  const placements: Placement[] = [];
  for (let i = 0; i < pairs; i++) {
    const y = from - ((from - to) * i) / Math.max(pairs - 1, 1);
    const scale = 1 - (i / pairs) * 0.2;
    const sized = { ...shape, length: shape.length * scale, width: shape.width * scale };
    placements.push({ x: 50, y, rotate: spread, shape: sized }, { x: 50, y, rotate: -spread, shape: sized });
  }
  if (tip) placements.push({ x: 50, y: to - 2, rotate: 0, shape: { ...shape, length: shape.length * 0.75, width: shape.width * 0.75 } });
  return placements;
}

const plates: Record<string, Plate> = {
  'nothofagus-dombeyi': {
    stem: sprig,
    leaves: alternate(7, { length: 24, width: 10, taper: 0.8, fullness: 0.9, margin: 'serrate', teeth: 9, depth: 0.22 }),
  },
  'eucryphia-cordifolia': {
    stem: 'M50 96 L50 78',
    leaves: [{ x: 50, y: 80, rotate: 0, shape: { length: 70, width: 30, taper: 0.9, fullness: 0.55, margin: 'serrate', teeth: 14, depth: 0.08 } }],
  },
  'aextoxicon-punctatum': {
    stem: 'M50 96 L50 44',
    leaves: opposite(2, { length: 38, width: 17, taper: 1, fullness: 0.7, margin: 'entire', dots: true }, 48, 78, 46),
  },
  'weinmannia-trichosperma': {
    stem: 'M50 96 L50 18',
    leaves: opposite(6, { length: 17, width: 8, taper: 0.9, fullness: 0.8, margin: 'serrate', teeth: 6, depth: 0.25 }, 72, 86, 20),
  },
  'laureliopsis-philippiana': {
    stem: 'M50 96 L50 42',
    leaves: opposite(2, { length: 40, width: 15, taper: 1.05, fullness: 0.85, margin: 'serrate', teeth: 11, depth: 0.16 }, 42, 80, 44),
  },
  'podocarpus-nubigenus': {
    stem: 'M50 96 C 50 70, 50 40, 50 8',
    leaves: alternate(12, { length: 26, width: 3.4, taper: 1, fullness: 0.25, margin: 'entire' }, 40, 88, 14),
  },
  'nothofagus-betuloides': {
    stem: sprig,
    leaves: alternate(9, { length: 15, width: 9, taper: 0.75, fullness: 0.85, margin: 'crenate', teeth: 7, depth: 0.18 }),
  },
  'nothofagus-pumilio': {
    stem: sprig,
    leaves: alternate(5, { length: 30, width: 15, taper: 1, fullness: 0.8, margin: 'double-crenate', teeth: 12, depth: 0.26 }, 52, 80, 26),
  },
};

// Un verde propio por especie para la aguada: ayuda a distinguir las láminas de un vistazo.
// El color no codifica ningún dato botánico.
const washes: Record<string, string> = {
  'nothofagus-dombeyi': '#2F9E55',
  'eucryphia-cordifolia': '#1E8A6A',
  'aextoxicon-punctatum': '#6DAE2E',
  'weinmannia-trichosperma': '#3E9B3A',
  'laureliopsis-philippiana': '#8DBF2F',
  'podocarpus-nubigenus': '#2A7A4F',
  'nothofagus-betuloides': '#58B24A',
  'nothofagus-pumilio': '#A4BF22',
};

export function speciesWash(speciesId: string) {
  return washes[speciesId] ?? '#3E9B3A';
}

/**
 * Centro de una hoja de la lámina, en unidades del viewBox (0–100), para la línea guía de la ficha.
 * Prefiere la hoja más inclinada a la izquierda: la guía baja a la esquina inferior izquierda sin
 * cruzar el dibujo.
 */
export function leafAnchor(speciesId: string): { x: number; y: number } | null {
  const leaves = plates[speciesId]?.leaves;
  if (!leaves?.length) return null;
  const leaf = leaves.reduce((left, candidate) => (candidate.rotate < left.rotate ? candidate : left));
  const angle = (leaf.rotate * Math.PI) / 180;
  const half = leaf.shape.length / 2;
  return { x: leaf.x + Math.sin(angle) * half, y: leaf.y - Math.cos(angle) * half };
}

/** `size` en dp; sin `size` la lámina ocupa el ancho de su contenedor (cuadrada). */
type LeafPlateProps = {
  speciesId: string;
  /** dp; sin `size` la lámina ocupa el ancho de su contenedor (cuadrada). */
  size?: number;
  ink?: string;
  /** Color de la aguada; por defecto el verde de la especie. */
  wash?: string;
  /** Entintar la lámina al montarse: tallo primero, luego cada hoja hacia el ápice. */
  draw?: boolean;
  delay?: number;
  /** ms del entintado completo; por defecto `DRAW_MS`. */
  duration?: number;
  easing?: EasingFunctionFactory;
};

const DRAW_MS = 900;
const STEM_LENGTH = 120;

export function LeafPlate({
  speciesId, size, ink: inkColor, wash, draw = false, delay = 0, duration = DRAW_MS, easing = easeOutExpo,
}: LeafPlateProps) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const animate = draw && !reducedMotion;
  const progress = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (!animate) return;
    return whenIdle(() => progress.set(withDelay(delay, withTiming(1, { duration, easing }))));
  }, [animate, delay, duration, easing, progress]);

  const plate = plates[speciesId];
  if (!plate) return null;
  // Sin animación se dibuja con trazos estáticos: no depende del motor de animación.
  const ink = animate ? progress : null;
  const small = size !== undefined && size < 80;
  const strokeWidth = small ? 1.6 : 0.8;
  const stroke = inkColor ?? color.leafInk;
  const washColor = wash ?? speciesWash(speciesId);
  const count = plate.leaves.length;
  const rand = seeded(seedOf(speciesId));

  return (
    <Svg width={size ?? '100%'} height={size ?? '100%'} viewBox="0 0 100 100" accessible={false}>
      {plate.stem ? (
        <InkPath progress={ink} from={0} to={0.4} length={STEM_LENGTH} d={plate.stem}
          stroke={stroke} strokeWidth={strokeWidth * 1.2} fill="none" />
      ) : null}
      {plate.leaves.map(({ x, y, rotate, shape }, i) => {
        // Tinta suelta: mitades desiguales, grosor que cambia de hoja en hoja y nervio que se curva.
        const outline = leafOutline(shape, 0.84 + rand() * 0.28);
        const weight = strokeWidth * (0.85 + rand() * 0.35);
        const bend = (rand() - 0.5) * shape.width * 0.35;
        const sketch = { turn: (rand() - 0.5) * 5, tx: (rand() - 0.5) * 0.8 };
        // Cada hoja empieza cuando el tallo llega a su altura; las ventanas se solapan.
        const from = 0.12 + (0.5 * i) / Math.max(count, 1);
        const to = Math.min(from + 0.45, 1);
        // La aguada cae un poco corrida, girada y más ancha que la tinta, como pintada a pulso: tres
        // pasadas tenues que no coinciden del todo, y el borde de la mayor más oscuro donde se secó.
        const dx = 1.2 + rand() * 1.4;
        const dy = 0.6 + rand() * 1.2;
        const turn = (rand() - 0.5) * 8;
        const passes = [1.16, 1.08, 0.96].map((scale, p) => ({
          scale,
          tx: dx + (rand() - 0.5) * 1.2,
          ty: -dy + (rand() - 0.5) * 1.2,
          turn: turn + (rand() - 0.5) * 6,
          opacity: color.washOpacity * (p === 2 ? 0.55 : 0.4),
        }));
        return (
          <G key={i} transform={`translate(${x} ${y}) rotate(${rotate})`}>
            <FadeGroup progress={ink} from={from} to={Math.min(from + 0.3, 1)}>
              {passes.map((pass, p) => (
                <G key={p}
                  transform={`translate(${pass.tx.toFixed(2)} ${pass.ty.toFixed(2)}) rotate(${pass.turn.toFixed(1)}) scale(${pass.scale} ${(pass.scale * 0.96).toFixed(3)})`}>
                  <Path d={outline.d} fill={washColor} fillOpacity={pass.opacity}
                    stroke={p === 0 ? washColor : 'none'} strokeOpacity={color.washOpacity * 0.7}
                    strokeWidth={small ? 1 : 0.6} strokeLinejoin="round" />
                </G>
              ))}
            </FadeGroup>
            <InkPath progress={ink} from={from} to={to} length={outline.perimeter} d={outline.d}
              stroke={stroke} strokeWidth={weight} fill="none" />
            {/* Segunda pasada fina y corrida, como el lápiz que repasa el contorno. */}
            <FadeGroup progress={ink} from={to - 0.15} to={to}>
              <G transform={`translate(${sketch.tx.toFixed(2)} 0) rotate(${sketch.turn.toFixed(1)})`} opacity={0.45}>
                <Path d={outline.d} stroke={stroke} strokeWidth={weight * 0.45} fill="none" strokeLinejoin="round" />
              </G>
            </FadeGroup>
            <InkPath progress={ink} from={from} to={from + 0.25} length={shape.length * 1.05}
              d={`M0,0 Q${bend.toFixed(2)},${(-shape.length * 0.5).toFixed(2)} 0,${(-shape.length * 0.98).toFixed(2)}`}
              stroke={stroke} strokeWidth={weight * 0.6} fill="none" />
            {shape.dots ? (
              <FadeGroup progress={ink} from={to - 0.1} to={to}>
                {[0.3, 0.45, 0.6, 0.75].flatMap((s) => [-1, 1].map((side) => (
                  <Circle key={`${s}${side}`} cx={side * shape.width * 0.2} cy={-shape.length * s} r={0.7} fill={stroke} />
                )))}
              </FadeGroup>
            ) : null}
          </G>
        );
      })}
    </Svg>
  );
}
