import { useEffect } from 'react';
import { useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';

import { easeOutExpo, InkPath } from '@/ui/ink';

// Curvas de nivel dibujadas en código. Son un motivo gráfico: no representan el relieve de
// Puyehue ni de ningún lugar real.

type Ring = { d: string; perimeter: number };

/** Anillo cerrado deformado por armónicos fijos; `r` es el radio medio en unidades del viewBox. */
function contourRing(cx: number, cy: number, r: number, phase: number): Ring {
  const steps = 72;
  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    const k = 1 + 0.09 * Math.sin(2 * a + phase) + 0.05 * Math.sin(3 * a + phase * 1.7) + 0.025 * Math.sin(5 * a - phase);
    points.push([cx + r * k * Math.cos(a), cy + r * k * 0.78 * Math.sin(a)]);
  }
  let perimeter = 0;
  for (let i = 1; i < points.length; i++) {
    perimeter += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return {
    d: `M${points.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' L')} Z`,
    perimeter: Math.ceil(perimeter) + 2,
  };
}

/** Una loma: anillos concéntricos cuyo centro se desplaza al subir, como una ladera asimétrica. */
function hill(cx: number, cy: number, radii: number[], phase: number, drift: [number, number]): Ring[] {
  return radii.map((r, i) => contourRing(cx + drift[0] * i, cy + drift[1] * i, r, phase + i * 0.35));
}

const coverHills = hill(150, 62, [74, 60, 47, 35, 24, 13], 0.6, [-2.2, -1.6]);

const DRAW_MS = 1400;

function useInk(draw: boolean, delay: number) {
  const reducedMotion = useReducedMotion();
  const animate = draw && !reducedMotion;
  const progress = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (animate) progress.set(withDelay(delay, withTiming(1, { duration: DRAW_MS, easing: easeOutExpo })));
  }, [animate, delay, progress]);
  return animate ? progress : null;
}

type ArtProps = { ink: string; fill: string };

/** Portada del Atlas: curvas que se entintan desde la base hacia la cima, en la tinta de la barra. */
export function ContourCover({ ink, fill }: ArtProps) {
  const progress = useInk(true, 120);
  const count = coverHills.length;
  return (
    <Svg width={240} height={130} viewBox="0 0 240 130" style={{ position: 'absolute', right: -40, top: -10, opacity: 0.5 }}
      accessible={false}>
      {coverHills.map((ring, i) => {
        const from = (0.55 * i) / count;
        return (
          <InkPath key={i} progress={progress} from={from} to={Math.min(from + 0.5, 1)} length={ring.perimeter} d={ring.d}
            stroke={ink} strokeWidth={1} fill={i === 5 ? fill : 'none'} />
        );
      })}
    </Svg>
  );
}

const curtainHill = hill(80, 64, [58, 46, 35, 25, 15, 6], 1.2, [-1.6, -1.2]);

/** Mientras carga el mapa base: una loma que se entinta sobre el papel. */
export function SurveyHill({ ink, fill }: ArtProps) {
  const progress = useInk(true, 0);
  const count = curtainHill.length;
  return (
    <Svg width={160} height={128} viewBox="0 0 160 128" accessible={false}>
      {curtainHill.map((ring, i) => {
        const from = (0.6 * i) / count;
        return (
          <InkPath key={i} progress={progress} from={from} to={Math.min(from + 0.45, 1)} length={ring.perimeter} d={ring.d}
            stroke={ink} strokeWidth={1.2} fill={i === count - 1 ? fill : 'none'} />
        );
      })}
    </Svg>
  );
}

const sheetHill = hill(36, 50, [26, 19, 12], 0.4, [-1, -1]);

/** Pliego vacío del Atlas: curvas de nivel y el contorno punteado de una observación que no está. */
export function EmptyAtlasSheet({ ink }: { ink: string }) {
  return (
    <Svg width={72} height={88} viewBox="0 0 72 88" accessible={false}>
      <Rect x={1} y={1} width={70} height={86} rx={4} stroke={ink} strokeWidth={1.5} fill="none" />
      <G opacity={0.6}>
        {sheetHill.map((ring, i) => (
          <Path key={i} d={ring.d} stroke={ink} strokeWidth={1} fill="none" />
        ))}
      </G>
      <Path d="M36 74c-6-7-10-12-10-17a10 10 0 0 1 20 0c0 5-4 10-10 17Z" stroke={ink} strokeWidth={1.5}
        strokeDasharray={[3, 3]} fill="none" strokeLinejoin="round" />
      <Circle cx={36} cy={57} r={3} stroke={ink} strokeWidth={1.5} strokeDasharray={[2, 2]} fill="none" />
    </Svg>
  );
}
