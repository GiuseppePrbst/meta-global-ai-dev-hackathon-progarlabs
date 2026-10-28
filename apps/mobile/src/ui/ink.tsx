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
import { G, Path } from 'react-native-svg';

// Primitivas de entintado: un trazo SVG que se dibuja según una ventana de un progreso compartido.
// Con `progress` nulo se dibujan trazos estáticos y no se depende del motor de animación.

export const easeOutExpo = Easing.bezier(0.16, 1, 0.3, 1);
// Ritmo de pluma para el entintado lento: arranca y se posa suave, y entre medio avanza parejo,
// así cada trazo se ve dibujarse en vez de aparecer de golpe.
export const easePen = Easing.bezier(0.45, 0, 0.25, 1);

// Tope de espera para empezar a entintar si el hilo JS no queda libre antes.
const IDLE_TIMEOUT_MS = 500;

/**
 * Programa `start` para cuando el hilo JS quede libre tras montar la pestaña: así el entintado no
 * compite con el primer render ni con el scroll inicial. Devuelve la limpieza para `useEffect`.
 */
export function whenIdle(start: () => void) {
  const handle = requestIdleCallback(start, { timeout: IDLE_TIMEOUT_MS });
  return () => cancelIdleCallback(handle);
}

/** Progreso de entintado de 0 a 1; nulo con movimiento reducido, para dibujar los trazos quietos. */
export function useInk(draw: boolean, delay: number, duration = 1400) {
  const reducedMotion = useReducedMotion();
  const animate = draw && !reducedMotion;
  const progress = useSharedValue(animate ? 0 : 1);
  useEffect(() => {
    if (!animate) return;
    return whenIdle(() => progress.set(withDelay(delay, withTiming(1, { duration, easing: easeOutExpo }))));
  }, [animate, delay, duration, progress]);
  return animate ? progress : null;
}

const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedG = Animated.createAnimatedComponent(G);

type Window = { progress: SharedValue<number> | null; from: number; to: number };
type AnimatedWindow = Window & { progress: SharedValue<number> };

export function FadeGroup({ progress, from, to, children }: Window & { children: React.ReactNode }) {
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

export function InkPath({ progress, ...props }: InkPathProps) {
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
