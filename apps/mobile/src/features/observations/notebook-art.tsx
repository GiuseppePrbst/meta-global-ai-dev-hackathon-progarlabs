import Svg from 'react-native-svg';

import { FadeGroup, InkPath, useInk, Wash } from '@/ui';

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
