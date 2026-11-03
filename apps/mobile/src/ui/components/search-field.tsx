import { type StyleProp, StyleSheet, TextInput, View, type ViewStyle } from 'react-native';

import { CloseIcon, SearchIcon } from '@/ui/components/icons';
import { IconButton } from '@/ui/components/icon-button';
import { radius, space, type, useTheme } from '@/ui/tokens/theme';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
  /** Etiqueta accesible del campo. */
  label: string;
  /** Etiqueta del botón que borra el texto. */
  clearLabel: string;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Campo de búsqueda en píldora gris claro de 48 dp. */
export function SearchField({ value, onChangeText, placeholder, label, clearLabel, autoFocus, style }: SearchFieldProps) {
  const { color } = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: color.surfaceMuted }, style]}>
      <SearchIcon color={color.onSurfaceVariant} size={20} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.onSurfaceVariant}
        accessibilityLabel={label}
        selectionColor={color.onLimeSoft}
        cursorColor={color.onSurface}
        returnKeyType="search"
        autoCorrect={false}
        autoFocus={autoFocus}
        style={[type.bodyLarge, styles.input, { color: color.onSurface }]}
      />
      {value ? (
        <IconButton label={clearLabel} onPress={() => onChangeText('')}>
          <CloseIcon color={color.onSurfaceVariant} size={20} />
        </IconButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 48,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.lg,
    paddingRight: space.xxs,
    gap: space.sm,
  },
  input: { flex: 1, paddingVertical: space.sm },
});
