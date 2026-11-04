import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, Text as RNText, View } from 'react-native';
import Animated, {
  Easing, interpolate, type SharedValue, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { t } from '@/i18n/es-CL';
import { easeOutExpo, lightPalette, type } from '@/ui';

// Splash animado de WiloQuest. El splash nativo (app.json → expo-splash-screen) solo muestra a Wilo:
// en Android 12+ el ícono del splash se recorta a un círculo y un texto quedaría cortado o diminuto.
// Esta capa empieza idéntica a él (mismo fondo, Wilo del mismo tamaño y en el centro), así que el
// relevo no se nota; después Wilo da un salto hacia arriba, el nombre aparece letra a letra en su
// morado y todo se funde con la app. Tocar la pantalla lo salta.

// Deben coincidir con app.json: fondo, `imageWidth` y la proporción de Wilo dentro de
// assets/images/splash-wilo.png (66 % del lienzo cuadrado).
const SPLASH_BACKGROUND = lightPalette.background;
const SPLASH_IMAGE_WIDTH = 200;
const WILO_WIDTH = SPLASH_IMAGE_WIDTH * 0.66;
const WILO_HEIGHT = WILO_WIDTH * (688 / 720);

const NAME = 'WiloQuest';
/** Cuánto sube Wilo para hacerle sitio al nombre. */
const LIFT = 52;
const NAME_SIZE = 46;
const NAME_GAP = 14;

// Coreografía (ms).
const HOP_DELAY = 150;
const LETTERS_START = 380;
const LETTER_STAGGER = 55;
const LETTER_DURATION = 420;
const HOLD_UNTIL = 1750;
const EXIT = 380;
const LETTERS_END = LETTERS_START + (NAME.length - 1) * LETTER_STAGGER + LETTER_DURATION;

export function SplashOverlay({ onDone }: { onDone: () => void }) {
  const reducedMotion = useReducedMotion();
  const lift = useSharedValue(0);
  const hop = useSharedValue(1);
  // Reloj de las letras: va de 0 a LETTERS_END ms; cada letra toma su tramo.
  const clock = useSharedValue(0);
  const exit = useSharedValue(0);

  const leave = () => {
    exit.set(withTiming(1, { duration: EXIT, easing: Easing.in(Easing.quad) }, (finished) => {
      if (finished) scheduleOnRN(onDone);
    }));
  };

  useEffect(() => {
    if (reducedMotion) {
      // Sin movimiento: la composición final aparece de una vez y se funde.
      lift.set(LIFT);
      clock.set(LETTERS_END);
      exit.set(withDelay(900, withTiming(1, { duration: EXIT }, (finished) => {
        if (finished) scheduleOnRN(onDone);
      })));
      return;
    }
    lift.set(withDelay(HOP_DELAY, withTiming(LIFT, { duration: 620, easing: easeOutExpo })));
    // Saltito: se estira al despegar y se asienta.
    hop.set(withDelay(HOP_DELAY, withSequence(
      withTiming(1.08, { duration: 200, easing: Easing.out(Easing.quad) }),
      withTiming(0.97, { duration: 160, easing: Easing.inOut(Easing.quad) }),
      withTiming(1, { duration: 220, easing: Easing.out(Easing.quad) }),
    )));
    clock.set(withTiming(LETTERS_END, { duration: LETTERS_END, easing: Easing.linear }));
    exit.set(withDelay(HOLD_UNTIL, withTiming(1, { duration: EXIT, easing: Easing.in(Easing.quad) }, (finished) => {
      if (finished) scheduleOnRN(onDone);
    })));
    // Los valores compartidos y onDone son estables durante la vida del splash.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  const screenStyle = useAnimatedStyle(() => ({ opacity: 1 - exit.get() }));
  const stageStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + exit.get() * 0.06 }] }));
  const wiloStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -lift.get() }, { scale: hop.get() }],
  }));

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.screen, screenStyle]}>
      <Pressable style={StyleSheet.absoluteFill} onPress={leave} accessible accessibilityRole="image" accessibilityLabel={t.splash.a11y}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.center, stageStyle]}>
          <Animated.View style={wiloStyle}>
            <Image source={require('../../../assets/images/wilo/wilo-greet.png')} style={styles.wilo} accessibilityIgnoresInvertColors />
          </Animated.View>
          <View style={styles.nameSlot} pointerEvents="none">
            <View style={styles.name}>
              {NAME.split('').map((letter, index) => (
                <Letter key={index} letter={letter} index={index} clock={clock} />
              ))}
            </View>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

/** Cada letra sube y aparece en su tramo del reloj, con un leve rebote de escala. */
function Letter({ letter, index, clock }: { letter: string; index: number; clock: SharedValue<number> }) {
  const start = LETTERS_START + index * LETTER_STAGGER;
  const style = useAnimatedStyle(() => {
    const p = interpolate(clock.get(), [start, start + LETTER_DURATION], [0, 1], 'clamp');
    // ease-out expo a mano: el reloj es lineal.
    const e = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
    return {
      opacity: interpolate(p, [0, 0.4], [0, 1], 'clamp'),
      transform: [{ translateY: (1 - e) * 22 }, { scale: 0.86 + 0.14 * e }],
    };
  });
  // «Quest» en el morado profundo de Wilo, «Wilo» en su morado principal.
  const deep = index >= 4;
  return (
    <Animated.View style={style}>
      <RNText style={[styles.letter, { color: deep ? lightPalette.wiloDeep : lightPalette.wilo }]}>{letter}</RNText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  screen: { backgroundColor: SPLASH_BACKGROUND, zIndex: 100, elevation: 100 },
  center: { alignItems: 'center', justifyContent: 'center' },
  wilo: { width: WILO_WIDTH, height: WILO_HEIGHT },
  // El nombre va bajo la posición final de Wilo sin empujarlo: Wilo empieza justo en el centro, como
  // en el splash nativo.
  nameSlot: {
    position: 'absolute', left: 0, right: 0, top: '50%', alignItems: 'center',
    marginTop: WILO_HEIGHT / 2 - LIFT + NAME_GAP,
  },
  name: { flexDirection: 'row' },
  letter: { ...type.display, fontFamily: 'Figtree_800ExtraBold', fontSize: NAME_SIZE, lineHeight: NAME_SIZE * 1.15, letterSpacing: 0 },
});
