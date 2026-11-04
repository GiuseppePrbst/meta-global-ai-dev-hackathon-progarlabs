import { useEffect, useMemo } from 'react';
import { type ImageSourcePropType, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  type SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

// Wilo saludando, articulado como una marioneta de recortes: la pose `greet` separada en capas
// (scripts/slice-wilo-greet.cjs) que se mueven sobre sus propias articulaciones. Un "cerebro" con
// tiempos al azar decide qué hace y cuándo, para que no parezca un bucle: respira, parpadea, mueve
// la cola, olfatea, sacude la oreja y mira alrededor con movimientos rápidos seguidos de quietud,
// como un animal atento. Al tocarlo se sobresalta.

const W = 720;
const H = 688;

export const GREET_LAYERS = {
  tail: require('../../../assets/images/wilo/greet/tail.png'),
  body: require('../../../assets/images/wilo/greet/body.png'),
  head: require('../../../assets/images/wilo/greet/head.png'),
  ear: require('../../../assets/images/wilo/greet/ear.png'),
  nose: require('../../../assets/images/wilo/greet/nose.png'),
  marks: require('../../../assets/images/wilo/greet/marks.png'),
} satisfies Record<string, ImageSourcePropType>;

/** Articulaciones en píxeles del arte original, convertidas a `transformOrigin`. */
const origin = (x: number, y: number) => `${(x / W) * 100}% ${(y / H) * 100}%`;
const PIVOT = {
  feet: origin(450, 650),
  tail: origin(225, 405),
  neck: origin(490, 258),
  ear: origin(362, 128),
  nose: origin(578, 118),
  marks: origin(612, 66),
};

// Ojos (centro, radios y giro, en px del arte) y colores de párpado muestreados del pelaje.
const EYES = [
  { cx: 477, cy: 98, rx: 35, ry: 30, rotate: 0 },
  { cx: 585, cy: 72, rx: 11, ry: 20, rotate: -10 },
];
const LID = '#8c4abd';
const LASH = '#3a1175';

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const chance = (p: number) => Math.random() < p;
const sine = Easing.inOut(Easing.sin);
const quick = Easing.out(Easing.cubic);
const settle = { damping: 14, stiffness: 180 };

type RigProps = {
  width: number;
  height: number;
  /** Cambia cada vez que lo tocan: dispara el sobresalto. */
  pokes: number;
};

export function WiloGreetRig({ width, height, pokes }: RigProps) {
  const breath = useSharedValue(0);
  const sway = useSharedValue(0);
  const tailFlick = useSharedValue(0);
  const headRot = useSharedValue(0);
  const headLift = useSharedValue(0);
  const ear = useSharedValue(0);
  const sniff = useSharedValue(0);
  const blink = useSharedValue(0);
  const marks = useSharedValue(1);

  const actions = useMemo(
    () => createActions({ tailFlick, headRot, headLift, ear, sniff, blink, marks }),
    [tailFlick, headRot, headLift, ear, sniff, blink, marks],
  );

  // Movimientos continuos: respiración y vaivén lento de la cola, con periodos que no coinciden.
  useEffect(() => {
    breath.set(withRepeat(withTiming(1, { duration: 1700, easing: sine }), -1, true));
    sway.set(withRepeat(withTiming(1, { duration: 2600, easing: sine }), -1, true));
    return () => {
      [breath, sway, tailFlick, headRot, headLift, ear, sniff, blink, marks].forEach(cancelAnimation);
    };
  }, [breath, sway, tailFlick, headRot, headLift, ear, sniff, blink, marks]);

  // Cerebro: cada conducta se reprograma sola con una espera al azar.
  useEffect(() => {
    const timers = new Set<ReturnType<typeof setTimeout>>();
    const every = (first: number, next: () => number, act: () => void) => {
      const run = () => {
        act();
        const id = setTimeout(run, next());
        timers.add(id);
      };
      timers.add(setTimeout(run, first));
    };
    every(rand(600, 1400), () => rand(2200, 5200), actions.blink);
    every(rand(1200, 2000), () => rand(2600, 5200), actions.look);
    every(rand(2500, 4000), () => rand(3500, 7000), actions.sniff);
    every(rand(3500, 5500), () => rand(4500, 9000), actions.earFlick);
    every(rand(2000, 3500), () => rand(3500, 7500), actions.tailFlick);
    return () => timers.forEach(clearTimeout);
  }, [actions]);

  useEffect(() => {
    if (pokes > 0) actions.startle();
  }, [pokes, actions]);

  const rootStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: 1 + 0.014 * breath.get() }, { scaleX: 1 + 0.006 * breath.get() }],
  }));
  const tailStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-2.5 + 5 * sway.get() + tailFlick.get()}deg` }],
  }));
  const headStyle = useAnimatedStyle(() => ({
    // La cabeza acompaña la respiración con un leve cabeceo.
    transform: [
      { translateY: -headLift.get() - 1.2 * breath.get() },
      { rotate: `${headRot.get() - 0.6 * breath.get()}deg` },
    ],
  }));
  const earStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${ear.get()}deg` }] }));
  const noseStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -1.5 * sniff.get() }, { scale: 1 + 0.07 * sniff.get() }],
  }));
  const marksStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, marks.get() * 1.4),
    transform: [{ scale: marks.get() }, { rotate: `${(1 - marks.get()) * -18}deg` }],
  }));

  const s = width / W;

  return (
    <Animated.View style={[{ width, height, transformOrigin: PIVOT.feet }, rootStyle]}>
      <Layer source={GREET_LAYERS.tail} style={[{ transformOrigin: PIVOT.tail }, tailStyle]} />
      <Layer source={GREET_LAYERS.body} />
      <Animated.View style={[StyleSheet.absoluteFill, { transformOrigin: PIVOT.neck }, headStyle]}>
        <Layer source={GREET_LAYERS.head} />
        {EYES.map((eye) => <Eyelid key={eye.cx} {...eye} scale={s} blink={blink} />)}
        <Layer source={GREET_LAYERS.ear} style={[{ transformOrigin: PIVOT.ear }, earStyle]} />
        <Layer source={GREET_LAYERS.nose} style={[{ transformOrigin: PIVOT.nose }, noseStyle]} />
        <Layer source={GREET_LAYERS.marks} style={[{ transformOrigin: PIVOT.marks }, marksStyle]} />
      </Animated.View>
    </Animated.View>
  );
}

function Layer({ source, style }: { source: ImageSourcePropType; style?: object }) {
  return (
    <Animated.Image source={source} style={[StyleSheet.absoluteFill, styles.layer, style]}
      resizeMode="contain" accessibilityIgnoresInvertColors />
  );
}

/**
 * Párpado superior: un círculo grande del color del pelaje que baja dentro de la silueta del ojo,
 * así su borde inferior es curvo como un párpado y no una cortina recta. El ojo es un círculo
 * aplastado (`scaleY`) para que el recorte sea una elipse en cualquier plataforma.
 */
function Eyelid({ cx, cy, rx, ry, rotate, scale, blink }:
  (typeof EYES)[number] & { scale: number; blink: SharedValue<number> }) {
  const d = 2 * rx * scale;
  const lid = d * 1.6;
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -lid + blink.get() * (d + 2 * scale) }],
  }));
  return (
    <View pointerEvents="none" style={{
      position: 'absolute', left: (cx - rx) * scale, top: cy * scale - rx * scale, width: d, height: d,
      borderRadius: d / 2, overflow: 'hidden', transform: [{ rotate: `${rotate}deg` }, { scaleY: ry / rx }],
    }}>
      <Animated.View style={[{
        position: 'absolute', top: 0, left: (d - lid) / 2, width: lid, height: lid, borderRadius: lid / 2,
        backgroundColor: LID, borderColor: LASH, borderWidth: Math.max(1.5, 3 * scale),
      }, style]} />
    </View>
  );
}

type Values = Record<'tailFlick' | 'headRot' | 'headLift' | 'ear' | 'sniff' | 'blink' | 'marks', SharedValue<number>>;

function createActions({ tailFlick, headRot, headLift, ear, sniff, blink, marks }: Values) {
  const blinkOnce = (delay = 0) => withDelay(delay, withSequence(
    withTiming(1, { duration: 70, easing: Easing.in(Easing.quad) }),
    withTiming(1, { duration: 40 }),
    withTiming(0, { duration: 130, easing: Easing.out(Easing.quad) }),
  ));
  const flickEar = () => withSequence(
    withTiming(-16, { duration: 55, easing: quick }),
    withTiming(5, { duration: 70 }),
    withTiming(-10, { duration: 55 }),
    withSpring(0, settle),
  );
  const popMarks = () => withSequence(
    withTiming(0, { duration: 60 }),
    withSpring(1, { damping: 8, stiffness: 260 }),
  );
  /** Gira la cabeza rápido, la sostiene quieta y vuelve con un pequeño asentamiento. */
  const glance = (rot: number, lift: number, hold: number) => {
    headRot.set(withSequence(
      withTiming(rot, { duration: rand(140, 220), easing: quick }),
      withTiming(rot + rand(-0.6, 0.6), { duration: hold }),
      withSpring(0, settle),
    ));
    headLift.set(withSequence(
      withTiming(lift, { duration: 180, easing: quick }),
      withTiming(lift, { duration: hold }),
      withSpring(0, settle),
    ));
  };

  return {
    blink: () => {
      // A veces parpadea dos veces seguidas.
      blink.set(chance(0.2) ? withSequence(blinkOnce(), blinkOnce(90)) : blinkOnce());
    },
    look: () => {
      const r = Math.random();
      if (r < 0.4) {
        // Levanta el hocico, alerta: estira el cuello y las marcas de atención reaparecen.
        glance(rand(-6, -4), rand(3, 5), rand(700, 1500));
        marks.set(popMarks());
        if (chance(0.5)) ear.set(flickEar());
      } else if (r < 0.75) {
        // Baja la mirada hacia adelante, curioso.
        glance(rand(4, 7), rand(-1, 1), rand(600, 1300));
        if (chance(0.5)) blink.set(blinkOnce(120));
      } else {
        // Ladea la cabeza con dos golpes cortos, como quien escucha.
        headRot.set(withSequence(
          withTiming(3.5, { duration: 120, easing: quick }),
          withDelay(rand(250, 450), withTiming(-2.5, { duration: 140, easing: quick })),
          withDelay(rand(300, 600), withSpring(0, settle)),
        ));
      }
    },
    sniff: () => {
      const n = Math.round(rand(3, 6));
      sniff.set(withRepeat(withSequence(
        withTiming(1, { duration: 75, easing: quick }),
        withTiming(0, { duration: 95 }),
      ), n, false));
      // Al olfatear empuja un poco el hocico hacia arriba.
      headLift.set(withSequence(withTiming(1.5, { duration: 120 }), withDelay(n * 170, withSpring(0, settle))));
    },
    earFlick: () => {
      ear.set(chance(0.3) ? withSequence(flickEar(), withDelay(160, flickEar())) : flickEar());
    },
    tailFlick: () => {
      const dir = chance(0.5) ? 1 : -1;
      tailFlick.set(withSequence(
        withTiming(9 * dir, { duration: 160, easing: quick }),
        withTiming(-4 * dir, { duration: 220, easing: sine }),
        withSpring(0, { damping: 9, stiffness: 120 }),
      ));
    },
    startle: () => {
      headRot.set(withSequence(
        withTiming(-8, { duration: 90, easing: quick }),
        withTiming(-7, { duration: 500 }),
        withSpring(0, settle),
      ));
      headLift.set(withSequence(
        withTiming(7, { duration: 90, easing: quick }),
        withTiming(6, { duration: 500 }),
        withSpring(0, settle),
      ));
      marks.set(popMarks());
      ear.set(withSequence(flickEar(), withDelay(100, flickEar())));
      tailFlick.set(withSequence(
        withTiming(-10, { duration: 120, easing: quick }),
        withSpring(0, { damping: 6, stiffness: 140 }),
      ));
      blink.set(blinkOnce(650));
    },
  };
}

const styles = StyleSheet.create({
  layer: { width: '100%', height: '100%' },
});
