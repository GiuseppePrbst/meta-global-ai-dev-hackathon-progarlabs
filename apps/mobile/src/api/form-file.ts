import { File } from 'expo-file-system';

// Parte de archivo para un FormData de subida (POST /identify, POST /guide/transcribe).
//
// En nativo, el SDK 58 reemplaza el `fetch` global por `expo/fetch` (expo/src/winter/runtime.native.ts),
// cuyo FormData NO acepta la parte propia de React Native `{ uri, name, type }`: falla con «Unsupported
// FormDataPart implementation» antes de salir a la red. Acepta texto, `Blob` o un objeto con
// `bytes()`, y toma `name` como nombre de archivo y `type` como Content-Type
// (expo/src/winter/fetch/convertFormData.ts). Por eso aquí se entrega un objeto que lee el archivo
// del caché con expo-file-system al enviarse, con el tipo explícito: el backend valida el
// Content-Type exacto (image/jpeg, audio/wav…).
//
// En web se usa el `Blob` en sí (lo arma quien llama, desde el data URI o el `blob:`).

/** Lo que acepta `expo/fetch` como archivo. Se declara como `Blob` para `FormData.append`. */
type BytesPart = { name: string; type: string; bytes: () => Promise<Uint8Array> };

/** Archivo local (`file://…`) como parte de FormData para `expo/fetch`. */
export function nativeFilePart(uri: string, name: string, type: string): Blob {
  const part: BytesPart = { name, type, bytes: () => new File(uri).bytes() };
  return part as unknown as Blob;
}

/** Agrega el archivo al FormData: el `Blob` en web, o la parte de `nativeFilePart` en nativo. */
export function appendFile(form: FormData, field: string, file: { uri: string; name: string; type: string }, blob?: Blob): void {
  if (blob) form.append(field, blob, file.name);
  else form.append(field, nativeFilePart(file.uri, file.name, file.type));
}
