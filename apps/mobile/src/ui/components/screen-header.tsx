import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/ui/components/text';
import { space } from '@/ui/tokens/theme';

type ScreenHeaderProps = {
  title: string;
  /** Botones de ícono a la derecha del título. */
  actions?: React.ReactNode;
  /** Lo que va bajo el título, p. ej. un campo de búsqueda. */
  children?: React.ReactNode;
};

/** Cabecera de una pestaña sobre fondo claro: título grande y acciones; respeta la barra de estado. */
export function ScreenHeader({ title, actions, children }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.header, { paddingTop: insets.top + space.md }]}>
      <View style={styles.row}>
        <Text variant="display" accessibilityRole="header" style={styles.title} numberOfLines={1}>{title}</Text>
        {actions ? <View style={styles.actions}>{actions}</View> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.md },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48, gap: space.md },
  title: { flex: 1 },
  actions: { flexDirection: 'row', gap: space.sm },
});
