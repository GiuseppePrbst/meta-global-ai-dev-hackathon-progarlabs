import { useCallback, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';

/**
 * Tamaño medido de una vista: se pasa `onLayout` a la vista y se leen `width` y `height`.
 * Vale 0 hasta la primera medición; no provoca un render nuevo si el tamaño no cambió.
 */
export function useLayoutSize() {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const onLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setSize((prev) => (prev.width === width && prev.height === height ? prev : { width, height }));
  }, []);
  return { width: size.width, height: size.height, onLayout };
}
