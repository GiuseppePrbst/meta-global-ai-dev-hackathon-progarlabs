import Svg, { Circle, Path, Rect } from 'react-native-svg';

export type IconProps = { color: string; size?: number; /** Relleno de la forma; los destinos activos lo usan. */ fill?: string };
export type IconComponent = (props: IconProps) => React.ReactNode;

// Íconos de trazo propio, 24 dp, trazo 1,8 con extremos redondeados.
function Icon({ color, size = 24, children }: Omit<IconProps, 'fill'> & { children: React.ReactNode }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8}
      strokeLinecap="round" strokeLinejoin="round">
      {children}
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Circle cx={10.5} cy={10.5} r={6.5} />
      <Path d="M15.5 15.5L20 20" />
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
      <Path d="M19 12H5M11 5l-7 7 7 7" />
    </Icon>
  );
}

export function ChevronIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M9.5 5.5L16 12l-6.5 6.5" />
    </Icon>
  );
}

export function ChevronLeftIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M14.5 5.5L8 12l6.5 6.5" />
    </Icon>
  );
}

export function InfoIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Circle cx={12} cy={12} r={9} />
      <Path d="M12 11v5M12 7.8v.2" />
    </Icon>
  );
}

// Destinos de la navegación principal: `fill` rellena la forma del destino activo.

export function IdentifyIcon({ fill = 'none', ...props }: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z" fill={fill} />
      <Path d="M5 19c3-4 6-7 9.5-9.5" />
    </Icon>
  );
}

export function MapIcon({ fill = 'none', ...props }: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M3.5 6.5L9 4l6 2.5L20.5 4v13.5L15 20l-6-2.5L3.5 20z" fill={fill} />
      <Path d="M9 4v13.5M15 6.5V20" />
    </Icon>
  );
}

export function SpeciesIcon({ fill = 'none', ...props }: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M12 3c3.5 2.5 5.5 5.7 5.5 9a5.5 5.5 0 01-11 0C6.5 8.7 8.5 5.5 12 3z" fill={fill} />
      <Path d="M12 21V9M12 13l-2.5-2M12 16l3-2.5" />
    </Icon>
  );
}

/** Seta: sombrero y pie. */
export function MushroomIcon({ fill = 'none', ...props }: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M3.5 12a8.5 8 0 0117 0H3.5z" fill={fill} />
      <Path d="M9.5 12v6.5a2.5 2.5 0 005 0V12" />
    </Icon>
  );
}

export function JournalIcon({ fill = 'none', ...props }: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5C17 4.5 14 5 12 6.5z" fill={fill} />
      <Path d="M12 6.5v13" />
    </Icon>
  );
}

export function ProfileIcon({ fill = 'none', ...props }: IconProps) {
  return (
    <Icon {...props}>
      <Circle cx={12} cy={8} r={3.8} fill={fill} />
      <Path d="M4.5 20c.8-3.8 3.8-6 7.5-6s6.7 2.2 7.5 6z" fill={fill} />
    </Icon>
  );
}

/** Ajustes: engranaje. */
export function SettingsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Circle cx={12} cy={12} r={3} />
      <Path d="M12 2.8l1.7 2.4 2.9-.6.6 2.9 2.4 1.7-1.3 2.8 1.3 2.8-2.4 1.7-.6 2.9-2.9-.6L12 21.2l-1.7-2.4-2.9.6-.6-2.9-2.4-1.7L5.7 12 4.4 9.2l2.4-1.7.6-2.9 2.9.6z" />
    </Icon>
  );
}

// Mapa.

export function ListIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M9 6.5h11M9 12h11M9 17.5h11" />
      <Circle cx={4.5} cy={6.5} r={0.6} />
      <Circle cx={4.5} cy={12} r={0.6} />
      <Circle cx={4.5} cy={17.5} r={0.6} />
    </Icon>
  );
}

/** Capas apiladas: alterna el mapa base. */
export function LayersIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M12 3.5L2.5 8.25 12 13l9.5-4.75L12 3.5z" />
      <Path d="M2.5 12.25L12 17l9.5-4.75" />
      <Path d="M2.5 16.25L12 21l9.5-4.75" />
    </Icon>
  );
}

/** Encuadrar: volver a ver todo el sendero (no es «mi ubicación»). */
export function FitIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M4 9V5.5A1.5 1.5 0 015.5 4H9M15 4h3.5A1.5 1.5 0 0120 5.5V9M20 15v3.5a1.5 1.5 0 01-1.5 1.5H15M9 20H5.5A1.5 1.5 0 014 18.5V15" />
    </Icon>
  );
}

export function TrailIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M4 19c3 0 4-2.5 6.5-2.5S14 18 16.5 15 15 9.5 17 7.5" />
      <Circle cx={18.5} cy={5.5} r={2} />
      <Circle cx={4} cy={19} r={0.8} />
    </Icon>
  );
}

export function PinIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0113 0c0 5.4-6.5 11-6.5 11z" />
      <Circle cx={12} cy={10} r={2.3} />
    </Icon>
  );
}

export function BinocularsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Circle cx={7} cy={15.5} r={3.5} />
      <Circle cx={17} cy={15.5} r={3.5} />
      <Path d="M10.5 15.5h3M4.5 13l2-7.5h3l.5 7M19.5 13l-2-7.5h-3l-.5 7" />
    </Icon>
  );
}

export function CameraIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M4 8.5A1.5 1.5 0 015.5 7h2l1.5-2.5h6L16.5 7h2A1.5 1.5 0 0120 8.5v9a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17.5z" />
      <Circle cx={12} cy={13} r={3.5} />
    </Icon>
  );
}

export function FlipCameraIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M4.5 11a7.5 7.5 0 0113.3-4.2M19.5 13a7.5 7.5 0 01-13.3 4.2" />
      <Path d="M18.5 3.5v3.8h-3.8M5.5 20.5v-3.8h3.8" />
    </Icon>
  );
}

export function FlagIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M6 21V4M6 4.5h10.5l-2 3.75 2 3.75H6" />
    </Icon>
  );
}

// Diario y ficha.

export function LeafIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z" />
      <Path d="M5 19c3-4 6-7 9.5-9.5" />
    </Icon>
  );
}

/** Corteza: tronco con placas. */
export function BarkIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M7 3.5v17M17 3.5v17" />
      <Path d="M10 6l1.5 3-1.5 3M14 10.5l-1.5 3 1.5 3.5M10 15.5l1 2.5" />
    </Icon>
  );
}

export function FootprintsIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M7.5 3.5c1.6 0 2.5 1.8 2.5 4s-.8 3.5-2.5 3.5S5 9.7 5 7.5s.9-4 2.5-4zM5.5 14h4l-.3 2.3a1.8 1.8 0 01-3.4 0z" />
      <Path d="M16.5 7.5c1.6 0 2.5 1.8 2.5 4s-.8 3.5-2.5 3.5S14 13.7 14 11.5s.9-4 2.5-4zM14.5 18h4l-.3 1.8a1.8 1.8 0 01-3.4 0z" />
    </Icon>
  );
}

export function StarIcon({ fill = 'none', ...props }: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M12 3.5l2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8-4.2-4.1 5.8-.8z" fill={fill} />
    </Icon>
  );
}

export function BookmarkIcon({ fill = 'none', ...props }: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M6.5 4h11v16.5L12 16.5l-5.5 4z" fill={fill} />
    </Icon>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Rect x={5} y={10.5} width={14} height={10} rx={2} />
      <Path d="M8 10.5V8a4 4 0 018 0v2.5" />
    </Icon>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M5 12.5l4.5 4.5L19 7.5" />
    </Icon>
  );
}

/** Modelo 3D: un cubo en perspectiva. */
export function CubeIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z" />
      <Path d="M4 7.5l8 4.5 8-4.5M12 12v9" />
    </Icon>
  );
}

export function ExternalIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Path d="M14 4.5h5.5V10M19.5 4.5L11 13M17 14v4.5a1.5 1.5 0 01-1.5 1.5h-10A1.5 1.5 0 014 18.5v-10A1.5 1.5 0 015.5 7H10" />
    </Icon>
  );
}

export function MicIcon(props: IconProps) {
  return (
    <Icon {...props}>
      <Rect x={9} y={3} width={6} height={11} rx={3} />
      <Path d="M5.5 11a6.5 6.5 0 0013 0M12 17.5V21" />
    </Icon>
  );
}
