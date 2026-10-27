import { Redirect } from 'expo-router';

// Hasta que existan las pestañas, la app abre en el catálogo.
export default function Index() {
  return <Redirect href="/species" />;
}
