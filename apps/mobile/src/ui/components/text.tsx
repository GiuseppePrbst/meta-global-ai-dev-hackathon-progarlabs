import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { type ColorToken, type, useTheme } from '@/ui/tokens/theme';

type TextProps = RNTextProps & {
  /** Estilo de la escala tipográfica. */
  variant: keyof typeof type;
  /** Color de la paleta; por defecto el texto principal sobre papel. */
  tone?: ColorToken;
};

/** Texto con la escala tipográfica y un color de la paleta; `style` ajusta lo demás. */
export function Text({ variant, tone = 'onSurface', style, ...props }: TextProps) {
  const { color } = useTheme();
  return <RNText style={[type[variant], { color: color[tone] }, style]} {...props} />;
}
