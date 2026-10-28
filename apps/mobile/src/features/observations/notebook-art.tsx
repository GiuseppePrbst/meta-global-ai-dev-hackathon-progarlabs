import Svg, { Path, Rect } from 'react-native-svg';

import { FadeGroup, InkPath, useInk, Wash } from '@/ui';

/** Libreta de terreno con renglones vacíos y una hoja punteada: el borrador que aún no existe. */
export function FieldNotebook({ ink, paper, accent }: { ink: string; paper: string; accent: string }) {
  return (
    <Svg width={176} height={150} viewBox="0 0 176 150" accessible={false} style={{ transform: [{ rotate: '-4deg' }] }}>
      <Rect x={28} y={8} width={124} height={134} rx={6} stroke={ink} strokeWidth={2} fill={paper} />
      <Path d="M44 8v134" stroke={ink} strokeWidth={1} opacity={0.6} />
      {[34, 52, 70, 88, 106, 124].map((y) => (
        <Path key={y} d={`M54 ${y}h84`} stroke={ink} strokeWidth={1} opacity={0.35} strokeLinecap="round" />
      ))}
      {[24, 48, 72, 96, 120].map((y) => (
        <Rect key={y} x={22} y={y} width={12} height={5} rx={2.5} stroke={ink} strokeWidth={1.2} fill="none" />
      ))}
      <Path d="M112 112c-12-6-15-18-6-34 13 12 16 24 6 34Zm0 0v12" stroke={accent} strokeWidth={2}
        strokeDasharray={[4, 3]} strokeLinecap="round" fill="none" />
      <Path d="M58 52h50M58 70h34" stroke={ink} strokeWidth={1.5} strokeDasharray={[2, 4]} strokeLinecap="round" opacity={0.7} />
    </Svg>
  );
}

// Trazos de la portada en orden de entintado; `length` es el largo aproximado de cada uno.
const coverStrokes = [
  { d: 'M70 14h96a6 6 0 0 1 6 6v100a6 6 0 0 1-6 6H70a6 6 0 0 1-6-6V20a6 6 0 0 1 6-6Z', length: 420 },
  { d: 'M80 14v112', length: 112 },
  ...[36, 52, 68, 84, 100].map((y) => ({ d: `M90 ${y}h${y < 68 ? 70 : 40}`, length: 70 })),
  { d: 'M150 108c-10-5-12-15-5-28 11 10 13 20 5 28Zm0 0v10', length: 80 },
  { d: 'M44 118 108 54l8 8-64 64-12 4Z', length: 210 },
];

/** Portada de Observaciones: una libreta de terreno cuyos renglones se entintan, con su lápiz. */
export function NotebookCover({ ink, wash }: { ink: string; wash: string }) {
  const progress = useInk(true, 120);
  const count = coverStrokes.length;
  return (
    <Svg width={200} height={140} viewBox="0 0 200 140" accessible={false}
      style={{ position: 'absolute', right: -36, top: -20, opacity: 0.85, transform: [{ rotate: '-6deg' }] }}>
      <FadeGroup progress={progress} from={0} to={0.4}>
        <Wash seed={61} cx={120} cy={70} rx={70} ry={52} color={wash} opacity={0.4} wobble={0.12} grain={10} />
      </FadeGroup>
      {coverStrokes.map((stroke, i) => {
        const from = (0.6 * i) / count;
        return (
          <InkPath key={stroke.d} progress={progress} from={from} to={Math.min(from + 0.4, 1)} length={stroke.length}
            d={stroke.d} stroke={ink} strokeWidth={1.3} fill="none" />
        );
      })}
    </Svg>
  );
}
