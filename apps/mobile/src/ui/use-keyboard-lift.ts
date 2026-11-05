import { type ComponentRef, type RefObject, useEffect } from 'react';
import { Keyboard, type KeyboardEvent, Platform, View } from 'react-native';
import { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

// Empuja el contenido hacia arriba mientras el teclado está abierto, para que lo que se escribe se
// vea. Funciona en Expo Go: usa los eventos de teclado de React Native y anima con Reanimated
// (`useAnimatedKeyboard` está en desuso y su reemplazo, react-native-keyboard-controller, necesita
// un módulo nativo que Expo Go no trae).
//
// Cómo calcula: `anchor` es la vista que debe quedar JUSTO SOBRE el teclado (su borde superior). Al
// abrirse, mide dónde está y anima un `paddingBottom` en el contenedor de lo necesario para subirla.
// Lo que está bajo `anchor` queda tapado por el teclado. Al cerrarse, vuelve a 0.
//
// iOS avisa antes de mostrar el teclado (`keyboardWillShow`), con su duración: la animación lo
// acompaña. Android solo avisa después (`keyboardDidShow`). En web no hay eventos y no hace nada.

const SHOW = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
const DEFAULT_MS = 250;
const EASING = Easing.out(Easing.cubic);

export function useKeyboardLift(
  anchor: RefObject<ComponentRef<typeof View> | null>,
  { gap = 8, reducedMotion = false, onShown }: { gap?: number; reducedMotion?: boolean; onShown?: () => void } = {},
) {
  const lift = useSharedValue(0);

  useEffect(() => {
    const animateTo = (value: number, event?: KeyboardEvent) => {
      const duration = reducedMotion ? 0 : event?.duration || DEFAULT_MS;
      lift.set(withTiming(value, { duration, easing: EASING }));
    };
    const show = Keyboard.addListener(SHOW, (event) => {
      const keyboardTop = event.endCoordinates.screenY;
      anchor.current?.measureInWindow((_x: number, y: number) => {
        // `y` ya incluye la subida actual: se suma para obtener la posición en reposo.
        const restTop = y + lift.get();
        animateTo(Math.max(0, restTop - keyboardTop + gap), event);
        onShown?.();
      });
    });
    const hide = Keyboard.addListener(HIDE, (event) => animateTo(0, event));
    return () => {
      show.remove();
      hide.remove();
    };
  }, [anchor, gap, lift, onShown, reducedMotion]);

  return useAnimatedStyle(() => ({ paddingBottom: lift.get() }));
}
