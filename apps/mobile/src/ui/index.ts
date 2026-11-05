// Librería de diseño de la app: tokens y componentes. Las pantallas y las features importan desde aquí;
// dentro de `ui/` los archivos se importan por su ruta directa.
// `ui/` no importa `features/` ni textos de `i18n`: lo que dice cada pieza llega por props.

export * from '@/ui/tokens/theme';
export * from '@/ui/tokens/motion';
export * from '@/ui/use-keyboard-lift';

export * from '@/ui/components/button';
export * from '@/ui/components/chip';
export * from '@/ui/components/cover-image';
export * from '@/ui/components/data-rows';
export * from '@/ui/components/empty-state';
export * from '@/ui/components/grid';
export * from '@/ui/components/icon-button';
export * from '@/ui/components/icons';
export * from '@/ui/components/loading-state';
export * from '@/ui/components/navigation-bar';
export * from '@/ui/components/pending-feature';
export * from '@/ui/components/pill-tabs';
export * from '@/ui/components/progress-bar';
export * from '@/ui/components/screen-header';
export * from '@/ui/components/search-field';
export * from '@/ui/components/sheet';
export * from '@/ui/components/status-banner';
export * from '@/ui/components/tag';
export * from '@/ui/components/text';
export * from '@/ui/components/text-button';
