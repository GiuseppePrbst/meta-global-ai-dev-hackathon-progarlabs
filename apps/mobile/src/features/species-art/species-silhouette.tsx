import Svg, { G, Path } from 'react-native-svg';

// Silueta de cada especie: la hoja de los árboles o la seta de los hongos. Es un esquema de su forma,
// no una representación fiel ni una fotografía. El Diario la muestra, en tono oscuro, para las especies que la persona aún no suma.
// Vive fuera de `catalog/` porque la usan el catálogo y el Diario: ninguna feature depende del
// interior de otra.

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
};

type Placement = { x: number; y: number; rotate: number; shape: LeafShape };

type Plate = { stem?: string; leaves: Placement[] };

/** Contorno de la hoja desde la base (0,0) hacia el ápice, como `d` de un path SVG. */
function leafOutline({ length, width, taper, fullness, margin, teeth = 0, depth = 0 }: LeafShape): string {
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
  const left = right.slice().reverse().map(([x, y]) => [-x, y] as [number, number]);
  const points = [...right, ...left];
  return `M${points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L')} Z`;
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
    leaves: opposite(2, { length: 38, width: 17, taper: 1, fullness: 0.7, margin: 'entire' }, 48, 78, 46),
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

const circle = (cx: number, cy: number, r: number) => `M${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 ${-r * 2},0 Z`;

// Hongos: formas rellenas en el mismo lienzo de 100 × 100.
const fungi: Record<string, string[]> = {
  // Racimo de esferas colgando de una rama.
  'cyttaria-espinosae': [
    'M6 26 L94 14 L95 21 L7 33 Z',
    circle(36, 46, 15), circle(63, 44, 13), circle(50, 72, 13),
  ],
  // Boleto: sombrero ancho y pie grueso.
  'butyriboletus-loyo': [
    'M10 50 C10 20, 90 20, 90 50 C90 57, 10 57, 10 50 Z',
    'M37 58 C33 72, 33 84, 40 92 L60 92 C67 84, 67 72, 63 58 Z',
  ],
};

type Drawing = { stem?: string; leaves: { transform: string; d: string }[]; shapes?: string[] };

// Las láminas son estáticas: cada silueta se calcula una vez y se reutiliza en cada render.
const drawings = new Map<string, Drawing>();

function drawingFor(speciesId: string): Drawing | undefined {
  const cached = drawings.get(speciesId);
  if (cached) return cached;
  const shapes = fungi[speciesId];
  if (shapes) {
    const drawing = { leaves: [], shapes };
    drawings.set(speciesId, drawing);
    return drawing;
  }
  const plate = plates[speciesId];
  if (!plate) return undefined;
  const drawing = {
    stem: plate.stem,
    leaves: plate.leaves.map(({ x, y, rotate, shape }) => ({ transform: `translate(${x} ${y}) rotate(${rotate})`, d: leafOutline(shape) })),
  };
  drawings.set(speciesId, drawing);
  return drawing;
}

type SpeciesSilhouetteProps = {
  speciesId: string;
  /** dp; sin `size` ocupa el ancho de su contenedor (cuadrada). */
  size?: number;
  color: string;
};

export function SpeciesSilhouette({ speciesId, size, color }: SpeciesSilhouetteProps) {
  const drawing = drawingFor(speciesId);
  if (!drawing) return null;
  return (
    <Svg width={size ?? '100%'} height={size ?? '100%'} viewBox="0 0 100 100">
      {drawing.stem ? <Path d={drawing.stem} stroke={color} strokeWidth={2.4} strokeLinecap="round" fill="none" /> : null}
      {drawing.shapes?.map((d, i) => <Path key={`s${i}`} d={d} fill={color} />)}
      {drawing.leaves.map(({ transform, d }, i) => (
        <G key={i} transform={transform}>
          <Path d={d} fill={color} />
        </G>
      ))}
    </Svg>
  );
}
