import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title} accessibilityRole="header">
        Hello World
      </Text>
      <Text style={styles.subtitle}>Bosque Vivo Chile</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  title: { fontSize: 32, fontWeight: '700', color: '#1b3a2b' },
  subtitle: { marginTop: 8, fontSize: 16, color: '#4a5a50' },
});
