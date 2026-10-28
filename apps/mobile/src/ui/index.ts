// Librería de diseño de la app: tokens, arte en código y componentes. Las pantallas y las features
// importan desde aquí; dentro de `ui/` los archivos se importan por su ruta directa.
// `ui/` no importa `features/` ni textos de `i18n`: lo que dice cada pieza llega por props.
// El DOM component del mapa importa `@/ui/art/brush` directo, nunca este índice (no puede cargar React Native).

export * from '@/ui/tokens/theme';
export * from '@/ui/tokens/motion';
export * from '@/ui/hooks/use-layout-size';

export * from '@/ui/art/watercolor';
export * from '@/ui/art/ink';
export * from '@/ui/art/paper';
export * from '@/ui/art/band-background';
export * from '@/ui/art/wash-thumb';

export * from '@/ui/components/app-bar';
export * from '@/ui/components/button';
export * from '@/ui/components/chip';
export * from '@/ui/components/divider';
export * from '@/ui/components/empty-state';
export * from '@/ui/components/herbarium-label';
export * from '@/ui/components/icon-button';
export * from '@/ui/components/icons';
export * from '@/ui/components/list-item';
export * from '@/ui/components/loading-state';
export * from '@/ui/components/navigation-bar';
export * from '@/ui/components/pending-feature';
export * from '@/ui/components/screen-header';
export * from '@/ui/components/search-field';
export * from '@/ui/components/segmented-control';
export * from '@/ui/components/status-banner';
export * from '@/ui/components/surface';
export * from '@/ui/components/tag';
export * from '@/ui/components/tape';
export * from '@/ui/components/text';
export * from '@/ui/components/text-button';
