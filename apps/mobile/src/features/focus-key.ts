import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

/**
 * Clave que cambia cada vez que la pantalla vuelve a tener el foco (no en el primero). Usada como
 * `key`, remonta la pantalla al volver a su pestaña: las pestañas inactivas siguen montadas, y así
 * el Diario y el Perfil repiten su entrada animada, vuelven arriba y reinician sus filtros.
 */
export function useFocusKey(): number {
  const [key, setKey] = useState(0);
  const focusedBefore = useRef(false);
  useFocusEffect(
    useCallback(() => {
      if (focusedBefore.current) setKey((current) => current + 1);
      focusedBefore.current = true;
    }, []),
  );
  return key;
}
