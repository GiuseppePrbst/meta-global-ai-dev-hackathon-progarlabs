import Svg, { Circle, Path } from 'react-native-svg';

type IconProps = { color: string; size?: number };

// Íconos de trazo propio, 24 dp, trazo 2 con extremos redondeados.
function Icon({ color, size = 24, children }: IconProps & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" accessible={false}>
      {children}
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Circle cx={10.5} cy={10.5} r={6} />
      <Path d="M15 15l5 5" />
    </Icon>
  );
}

export function CloseIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M6 6l12 12M18 6L6 18" />
    </Icon>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M20 12H5M11 5l-7 7 7 7" />
    </Icon>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M9 5l7 7-7 7" />
    </Icon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 11v5M12 8h.01" />
    </Icon>
  );
}

// Navegación principal. La variante activa rellena la forma con `fill`, como pide Material para el destino actual.
type NavIconProps = IconProps & { fill?: string };

export function IdentifyIcon({ fill = 'none', ...props }: NavIconProps) {
  return (
    <Icon {...props}>
      <Path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2" />
      <Path d="M12 17c-3-1.5-4-4.5-1.5-9C14 11 15 14.5 12 17Z" fill={fill} />
    </Icon>
  );
}

export function SpeciesIcon({ fill = 'none', ...props }: NavIconProps) {
  return (
    <Icon {...props}>
      <Path d="M6 3h12a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" fill={fill} />
      <Path d="M12 17V8M12 14c-2.2-.3-3.3-1.6-3.2-3.6 2.1.1 3.1 1.3 3.2 3.6ZM12 11.5c.2-2 1.3-3.2 3.2-3.4.1 2-1 3.2-3.2 3.4Z" />
    </Icon>
  );
}

export function AtlasIcon({ fill = 'none', ...props }: NavIconProps) {
  return (
    <Icon {...props}>
      <Path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20Z" fill={fill} />
      <Path d="M9 4v13.5M15 6.5V20" />
    </Icon>
  );
}

export function ObservationsIcon({ fill = 'none', ...props }: NavIconProps) {
  return (
    <Icon {...props}>
      <Path d="M7 3h11a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" fill={fill} />
      <Path d="M9 8h6M9 12h6M9 16h3" />
    </Icon>
  );
}

export function PlusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M12 5v14M5 12h14" />
    </Icon>
  );
}

export function MinusIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M5 12h14" />
    </Icon>
  );
}

/** Volver al encuadre inicial: esquinas de visor alrededor de un punto. */
export function FrameIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M4 9V5h4M16 5h4v4M20 15v4h-4M8 19H4v-4" />
      <Circle cx={12} cy={12} r={2} />
    </Icon>
  );
}

export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01" />
    </Icon>
  );
}

export function LeafIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14zM5 19l8-8" />
    </Icon>
  );
}

export function PhotoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 16l5-5 4 4 2-2 5 5" />
      <Circle cx={15.5} cy={9.5} r={1.5} />
    </Icon>
  );
}
