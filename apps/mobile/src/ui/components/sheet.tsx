import { Modal, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CloseIcon } from '@/ui/components/icons';
import { IconButton } from '@/ui/components/icon-button';
import { Text } from '@/ui/components/text';
import { radius, space, useTheme } from '@/ui/tokens/theme';

type SheetProps = {
  visible: boolean;
  title: string;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
};

/** Hoja inferior oscura con título y cierre; Atrás y tocar fuera también la cierran. */
export function Sheet({ visible, title, closeLabel, onClose, children }: SheetProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent navigationBarTranslucent>
      <View style={styles.root}>
        <Pressable style={[StyleSheet.absoluteFill, { backgroundColor: color.scrim }]} onPress={onClose}
          accessibilityRole="button" accessibilityLabel={closeLabel} />
        <View style={[styles.sheet, { backgroundColor: color.darkSurface, paddingBottom: insets.bottom + space.lg }]}
          accessibilityViewIsModal>
          <View style={[styles.handle, { backgroundColor: color.darkOutline }]} />
          <View style={styles.head}>
            <Text variant="titleLarge" tone="onDark" accessibilityRole="header" style={styles.title}>{title}</Text>
            <IconButton label={closeLabel} onPress={onClose} look="plain">
              <CloseIcon color={color.onDark} />
            </IconButton>
          </View>
          <ScrollView contentContainerStyle={styles.body}>{children}</ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, maxHeight: '86%' },
  handle: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginTop: space.sm },
  head: { flexDirection: 'row', alignItems: 'center', paddingLeft: space.xl, paddingRight: space.sm, paddingTop: space.sm },
  title: { flex: 1 },
  body: { paddingHorizontal: space.xl, paddingBottom: space.md, gap: space.lg },
});
