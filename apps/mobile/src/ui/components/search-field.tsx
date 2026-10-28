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
  style?: StyleProp<ViewStyle>;
};

/** Campo de búsqueda en píldora blanca de 56 dp, pensado para ir sobre la banda de una barra superior. */
export function SearchField({ value, onChangeText, placeholder, label, clearLabel, style }: SearchFieldProps) {
  const { color } = useTheme();
  return (
    <View style={[styles.search, { backgroundColor: color.searchField }, style]}>
      <SearchIcon color={color.onSearchFieldVariant} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={color.onSearchFieldVariant}
        accessibilityLabel={label}
        selectionColor={color.leafInk}
        cursorColor={color.leafInk}
        returnKeyType="search"
        autoCorrect={false}
        style={[type.bodyLarge, styles.input, { color: color.onSearchField }]}
      />
      {value ? (
        <IconButton label={clearLabel} onPress={() => onChangeText('')} hitSlop={4}>
          <CloseIcon color={color.onSearchFieldVariant} />
        </IconButton>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  search: {
    minHeight: 56,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.lg,
    paddingRight: space.xs,
    gap: space.md,
  },
  input: { flex: 1, paddingVertical: space.md },
});
