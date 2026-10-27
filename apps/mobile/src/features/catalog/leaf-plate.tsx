import { useEffect } from 'react';
import Animated, {
  Easing,
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Path } from 'react-native-svg';

import { useTheme } from '@/ui/theme';

// Ilustración conceptual de la hoja de cada especie, dibujada en código.
// Es un esquema de la forma, no una representación fiel ni una fotografía.

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

/** Contorno de la hoja desde la base (0,0) hacia el ápice, y su perímetro para el trazo animado. */
function leafOutline({ length, width, taper, fullness, margin, teeth = 0, depth = 0 }: LeafShape) {
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

/** `size` en dp; sin `size` la lámina ocupa el ancho de su contenedor (cuadrada). */
type LeafPlateProps = {
  speciesId: string;
  /** dp; sin `size` la lámina ocupa el ancho de su contenedor (cuadrada). */
  size?: number;
  ink?: string;
  fill?: string;
  /** Entintar la lámina al montarse: tallo primero, luego cada hoja hacia el ápice. */
  draw?: boolean;
  delay?: number;
};

const DRAW_MS = 900;
const STEM_LENGTH = 120;
const easeOutExpo = Easing.bezier(0.16, 1, 0.3, 1);

export function LeafPlate({ speciesId, size, ink: inkColor, fill, draw = false, delay = 0 }: LeafPlateProps) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const animate = draw && !reducedMotion;
  const progress = useSharedValue(animate ? 0 : 1);

  useEffect(() => {
    if (animate) progress.set(withDelay(delay, withTiming(1, { duration: DRAW_MS, easing: easeOutExpo })));
  }, [animate, delay, progress]);

  const plate = plates[speciesId];
  if (!plate) return null;
  // Sin animación se dibuja con trazos estáticos: no depende del motor de animación.
  const ink = animate ? progress : null;
  const strokeWidth = size !== undefined && size < 80 ? 1.6 : 0.7;
  const stroke = inkColor ?? color.leafInk;
  const leafFill = fill ?? color.leafFill;
  const count = plate.leaves.length;

  return (
    <Svg width={size ?? '100%'} height={size ?? '100%'} viewBox="0 0 100 100" accessible={false}>
      {plate.stem ? (
        <InkPath progress={ink} from={0} to={0.4} length={STEM_LENGTH} d={plate.stem}
          stroke={stroke} strokeWidth={strokeWidth * 1.2} fill="none" />
      ) : null}
      {plate.leaves.map(({ x, y, rotate, shape }, i) => {
        const outline = leafOutline(shape);
        // Cada hoja empieza cuando el tallo llega a su altura; las ventanas se solapan.
        const from = 0.12 + (0.5 * i) / Math.max(count, 1);
        const to = Math.min(from + 0.45, 1);
        return (
          <G key={i} transform={`translate(${x} ${y}) rotate(${rotate})`}>
            <InkPath progress={ink} from={from} to={to} length={outline.perimeter} d={outline.d}
              stroke={stroke} strokeWidth={strokeWidth} fill={leafFill} />
            <InkPath progress={ink} from={from} to={from + 0.25} length={shape.length}
              d={`M0,0 L0,${(-shape.length * 0.92).toFixed(2)}`} stroke={stroke} strokeWidth={strokeWidth * 0.6} fill="none" />
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

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

type Window = { progress: SharedValue<number> | null; from: number; to: number };
type AnimatedWindow = Window & { progress: SharedValue<number> };

function FadeGroup({ progress, from, to, children }: Window & { children: React.ReactNode }) {
  if (!progress) return <G>{children}</G>;
  return <AnimatedFadeGroup progress={progress} from={from} to={to}>{children}</AnimatedFadeGroup>;
}

function AnimatedFadeGroup({ progress, from, to, children }: AnimatedWindow & { children: React.ReactNode }) {
  const animatedProps = useAnimatedProps(() => ({
    opacity: interpolate(progress.get(), [from, to], [0, 1], Extrapolation.CLAMP),
  }));
  return <AnimatedG animatedProps={animatedProps}>{children}</AnimatedG>;
}

type InkPathProps = Window & {
  length: number;
  d: string;
  stroke: string;
  strokeWidth: number;
  fill: string;
};

function InkPath({ progress, ...props }: InkPathProps) {
  if (!progress) {
    const { d, stroke, strokeWidth, fill } = props;
    return <Path d={d} stroke={stroke} strokeWidth={strokeWidth} fill={fill} strokeLinecap="round" strokeLinejoin="round" />;
  }
  return <AnimatedInkPath progress={progress} {...props} />;
}

/** Trazo que se entinta entre `from` y `to` del progreso; el relleno llega al cerrar el contorno. */
function AnimatedInkPath({ progress, from, to, length, d, stroke, strokeWidth, fill }: InkPathProps & AnimatedWindow) {
  const animatedProps = useAnimatedProps(() => {
    const local = interpolate(progress.get(), [from, to], [0, 1], Extrapolation.CLAMP);
    return {
      strokeDashoffset: length * (1 - local),
      fillOpacity: interpolate(local, [0.6, 1], [0, 1], Extrapolation.CLAMP),
    };
  });
  return (
    <AnimatedPath d={d} stroke={stroke} strokeWidth={strokeWidth} fill={fill} strokeLinecap="round"
      strokeLinejoin="round" strokeDasharray={[length, length]} animatedProps={animatedProps} />
  );
}
