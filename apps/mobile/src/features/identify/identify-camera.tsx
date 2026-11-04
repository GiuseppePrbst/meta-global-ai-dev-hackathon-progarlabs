import { CameraView, type CameraType, useCameraPermissions } from 'expo-camera';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Species } from '@/domain/species';
import { useSpeciesCatalog } from '@/features/catalog/use-species';
import { getReferencePhoto } from '@/features/catalog/reference-photos';
import { IdentifyResult } from '@/features/identify/identify-result';
import { pickDemoSpecies } from '@/features/identify/wilo-chat';
import { t } from '@/i18n/es-CL';
import { Button, CameraIcon, NAVIGATION_BAR_OVERLAP, FlipCameraIcon, IconButton, Text, radius, space, useTheme } from '@/ui';

const NOTICE_MS = 2600;


/**
 * Visor de cámara de Identificar. La foto se toma en memoria y se descarta en el acto, sin escribirla
 * en disco ni enviarla. DEMO: tras la captura se muestra una especie del catálogo elegida al azar
 * (wilo-chat.ts), no una identificación. La cámara solo corre con la pestaña visible.
 */
export function IdentifyCamera() {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const focused = useIsFocused();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [facing, setFacing] = useState<CameraType>('back');
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(false);
  const { data: catalog } = useSpeciesCatalog();
  const [result, setResult] = useState<Species | null>(null);
  const lastId = useRef<string | null>(null);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(false), NOTICE_MS);
    return () => clearTimeout(id);
  }, [notice]);

  // Al salir de la pestaña se desmonta la cámara; al volver espera de nuevo a que esté lista.
  // Se ajusta durante el render (patrón de React para estado derivado de un cambio de prop).
  const [wasFocused, setWasFocused] = useState(focused);
  if (focused !== wasFocused) {
    setWasFocused(focused);
    if (!focused) setReady(false);
  }

  const fail = () => {
    setNotice(true);
    AccessibilityInfo.announceForAccessibility(t.identify.captureError);
  };

  const showResult = () => {
    const species = pickDemoSpecies(catalog ?? [], (id) => !!getReferencePhoto(id), lastId.current);
    if (!species) return fail();
    lastId.current = species.id;
    setReady(false);
    setResult(species);
  };

  const capture = async () => {
    if (!camera.current || !ready || busy) return;
    setBusy(true);
    try {
      if (Platform.OS === 'web') {
        // En web la foto llega como data URI en memoria; se suelta sin usarla.
        await camera.current.takePictureAsync({ quality: 0.8 });
      } else {
        // `pictureRef` deja la imagen en memoria nativa (no crea archivo en caché) y se libera de inmediato.
        const picture = await camera.current.takePictureAsync({ pictureRef: true });
        picture.release();
      }
      showResult();
    } catch {
      fail();
    } finally {
      setBusy(false);
    }
  };

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + space.md }]} pointerEvents="box-none">
      <Text variant="display" tone="onDark" accessibilityRole="header">{t.identify.title}</Text>
    </View>
  );

  if (!permission) {
    return (
      <View style={[styles.screen, styles.center, { backgroundColor: color.dark }]}>
        <ActivityIndicator color={color.lime} />
      </View>
    );
  }

  if (!permission.granted || failed) {
    const blocked = !failed && !permission.canAskAgain;
    const copy = failed
      ? { heading: t.identify.unavailableHeading, body: t.identify.unavailableBody, action: t.identify.unavailableAction }
      : blocked
        ? { heading: t.identify.deniedHeading, body: t.identify.deniedBody, action: t.identify.deniedAction }
        : { heading: t.identify.permissionHeading, body: t.identify.permissionBody, action: t.identify.permissionAction };
    const onAction = failed
      ? () => router.navigate('/species')
      : blocked
        ? () => Linking.openSettings()
        : () => requestPermission();
    // En web no hay ajustes que abrir: se ofrece el camino que sí funciona.
    const webBlocked = blocked && Platform.OS === 'web';
    return (
      <View style={[styles.screen, { backgroundColor: color.dark }]}>
        {header}
        <View style={styles.permission}>
          <View style={[styles.permissionIcon, { backgroundColor: color.darkSurfaceHigh }]}>
            <CameraIcon color={color.lime} size={28} />
          </View>
          <Text variant="headline" tone="onDark">{copy.heading}</Text>
          <Text variant="bodyMedium" tone="onDarkVariant">{copy.body}</Text>
          <Button
            label={webBlocked ? t.identify.unavailableAction : copy.action}
            onPress={webBlocked ? () => router.navigate('/species') : onAction}
          />
        </View>
      </View>
    );
  }

  if (result) return <IdentifyResult species={result} onBack={() => setResult(null)} />;

  const front = facing === 'front';
  return (
    <View style={[styles.screen, { backgroundColor: color.dark }]}>
      {focused ? (
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing={facing} mode="picture" mute
          onCameraReady={() => setReady(true)} onMountError={() => setFailed(true)} />
      ) : null}
      {header}
      {!ready ? (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <ActivityIndicator color={color.lime} />
          <Text variant="bodyMedium" tone="onDarkVariant">{t.identify.starting}</Text>
        </View>
      ) : null}
      <View style={styles.bottom} pointerEvents="box-none">
        {notice ? (
          <View style={[styles.notice, { backgroundColor: color.darkScrim, borderColor: color.darkOutline }]}
            accessibilityLiveRegion="polite">
            <Text variant="bodySmall" tone="onDark">{t.identify.captureError}</Text>
          </View>
        ) : null}
        <View style={styles.controls}>
          <View style={styles.side} />
          <Pressable onPress={capture} disabled={!ready || busy} accessibilityRole="button"
            accessibilityLabel={t.identify.shutterA11y} accessibilityState={{ disabled: !ready || busy, busy }}
            style={[styles.shutter, { borderColor: color.onDark, opacity: !ready ? 0.5 : 1 }]}>
            {({ pressed }) => (
              <View style={[styles.shutterFace, { backgroundColor: color.lime, transform: [{ scale: pressed || busy ? 0.9 : 1 }] }]} />
            )}
          </Pressable>
          <View style={styles.side}>
            <IconButton look="dark" label={t.identify.flip(front)} onPress={() => setFacing(front ? 'back' : 'front')}>
              <FlipCameraIcon color={color.onDark} />
            </IconButton>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  center: { alignItems: 'center', justifyContent: 'center', gap: space.md },
  header: { paddingHorizontal: space.lg, paddingBottom: space.md, gap: space.md },
  permission: { flex: 1, justifyContent: 'center', padding: space.xl, gap: space.md },
  permissionIcon: { width: 56, height: 56, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, padding: space.lg, paddingBottom: space.xl + NAVIGATION_BAR_OVERLAP, gap: space.lg },
  notice: { alignSelf: 'center', paddingHorizontal: space.md, paddingVertical: space.sm + 2, borderRadius: radius.md, borderWidth: 1 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  side: { width: 56, alignItems: 'center' },
  shutter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, alignItems: 'center', justifyContent: 'center' },
  shutterFace: { width: 60, height: 60, borderRadius: 30 },
});
