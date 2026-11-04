import { Image, type ImageProps, StyleSheet } from 'react-native';

type CoverImageProps = Omit<ImageProps, 'resizeMode' | 'style'> & {
  /** Por defecto llena a su contenedor (posición absoluta); con un estilo propio, ese estilo fija la caja. */
  style?: ImageProps['style'];
};

/**
 * Foto que cubre su caja completa, centrada y recortando lo que sobra, sin deformarse. Es la forma de
 * mostrar todas las fotos de la app: tarjetas, ficha, sendero y miniaturas.
 */
export function CoverImage({ style, ...props }: CoverImageProps) {
  return <Image accessibilityIgnoresInvertColors {...props} resizeMode="cover" style={style ?? styles.fill} />;
}

const styles = StyleSheet.create({
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, width: '100%', height: '100%' },
});
