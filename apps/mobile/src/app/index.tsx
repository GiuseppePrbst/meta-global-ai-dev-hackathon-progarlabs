import { Redirect } from 'expo-router';

// La raíz abre en el catálogo de especies, la pestaña con contenido navegable sin conexión.
export default function Index() {
  return <Redirect href="/species" />;
}
