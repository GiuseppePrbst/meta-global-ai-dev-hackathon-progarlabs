import { useQuery } from '@tanstack/react-query';
import { CameraView, type CameraType, useCameraPermissions } from 'expo-camera';
import { ImagePickerOptions, launchImageLibraryAsync, UIImagePickerPreferredAssetRepresentationMode } from 'expo-image-picker';
import { router, useIsFocused } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Linking, Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { fetchDemoStatus } from '@/api/demo-status';
import { IDENTIFY_LIVE, identifyBaseUrl, identifyTransport } from '@/api/identify';
import type { WiloConsents } from '@/domain/wilo';
import { aiErrorMessage } from '@/features/api-error-message';
import { useSpeciesCatalog } from '@/features/catalog/use-species';
import { IdentifyMiss } from '@/features/identify/identify-miss';
import { IdentifyResult } from '@/features/identify/identify-result';
import {
  discardPhoto, type IdentifyAttempt, isTooLarge, libraryPhoto, toCapturedPhoto, useIdentify,
} from '@/features/identify/use-identify';
import { missingConsents, wiloConsentStore } from '@/features/wilo/wilo-consent';
import { WiloConsentSheet } from '@/features/wilo/wilo-consent-sheet';
import { t } from '@/i18n/es-CL';
import type { CapturedPhoto } from '@/domain/identification';
import {
  Button, CameraIcon, FlipCameraIcon, GalleryIcon, IconButton, NAVIGATION_BAR_OVERLAP, radius, space, Text, useTheme,
} from '@/ui';

const NOTICE_MS = 4000;
const DEMO_STATUS_STALE_MS = 60_000;

// Galería: una sola foto, sin recorte. `quality < 1` y el modo «compatible» de iOS hacen que el sistema
// entregue JPEG en vez de HEIC, que la API rechazaría (415). El selector deja una copia en el caché.
const LIBRARY_OPTIONS: ImagePickerOptions = {
  mediaTypes: ['images'],
  allowsEditing: false,
  allowsMultipleSelection: false,
  quality: 0.8,
  exif: false,
  base64: false,
  preferredAssetRepresentationMode: UIImagePickerPreferredAssetRepresentationMode.Compatible,
};

type Source = 'camera' | 'gallery';

/**
 * Visor de cámara de Identificar, con la opción de elegir una foto de la galería. La foto (o la copia
 * que deja el selector de galería) queda en el caché solo hasta que POST /identify responde
 * (src/api/identify.ts, SIMULADO por defecto) y se borra en el acto. En mock la «candidata» es una
 * especie del catálogo elegida al azar (use-identify.ts), rotulada como prueba. La cámara solo corre
 * con la pestaña visible.
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
  const [capturing, setCapturing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [consentFor, setConsentFor] = useState<Source | null>(null);
  const consents = wiloConsentStore.useValue();
  const { data: catalog } = useSpeciesCatalog();
  const { identify, isPending: identifying } = useIdentify(catalog);
  const [result, setResult] = useState<IdentifyAttempt | null>(null);
  const busy = capturing || identifying;

  const statusSend = useMemo(() => identifyTransport(), []);
  const { data: status } = useQuery({
    queryKey: ['identify', 'demo-status', IDENTIFY_LIVE],
    queryFn: ({ signal }) => fetchDemoStatus(statusSend, identifyBaseUrl(), signal),
    staleTime: DEMO_STATUS_STALE_MS,
  });
  const closedReason = status && (!status.active || !status.features.includes('identify'))
    ? (status.active ? t.identify.featureClosed : t.identify.unavailable)
    : null;

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), NOTICE_MS);
    return () => clearTimeout(id);
  }, [notice]);

  // Al salir de la pestaña se desmonta la cámara; al volver espera de nuevo a que esté lista.
  // Se ajusta durante el render (patrón de React para estado derivado de un cambio de prop).
  const [wasFocused, setWasFocused] = useState(focused);
  if (focused !== wasFocused) {
    setWasFocused(focused);
    if (!focused) setReady(false);
  }

  const say = (text: string) => {
    setNotice(text);
    AccessibilityInfo.announceForAccessibility(text);
  };

  /** Envía la foto a POST /identify y muestra el resultado. La foto se borra al terminar. */
  const submit = async (photo: CapturedPhoto, given: WiloConsents) => {
    if (isTooLarge(photo)) {
      discardPhoto(photo);
      return say(t.identify.photoTooLarge);
    }
    try {
      const outcome = await identify(photo, given);
      if (outcome.kind === 'species') setReady(false);
      setResult(outcome);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      say(aiErrorMessage(error instanceof Error ? error : null, 'photo'));
    }
  };

  const capture = async (given: WiloConsents) => {
    if (!camera.current || !ready || busy) return;
    setCapturing(true);
    let photo: CapturedPhoto;
    try {
      // Nativo: archivo JPEG en caché. Web: data URI en memoria.
      photo = toCapturedPhoto(await camera.current.takePictureAsync({ quality: 0.7 }));
    } catch {
      return say(t.identify.captureError);
    } finally {
      setCapturing(false);
    }
    await submit(photo, given);
  };

  const pickFromGallery = async (given: WiloConsents) => {
    if (busy) return;
    setCapturing(true);
    let picked;
    try {
      picked = await launchImageLibraryAsync(LIBRARY_OPTIONS);
    } catch {
      return say(t.identify.galleryError);
    } finally {
      setCapturing(false);
    }
    const asset = picked.canceled ? undefined : picked.assets[0];
    if (!asset) return;
    const photo = libraryPhoto(asset);
    if (!photo) return say(t.identify.photoUnsupported);
    await submit(photo, given);
  };

  const run = (source: Source, given: WiloConsents) =>
    void (source === 'camera' ? capture(given) : pickFromGallery(given));

  /** Los consentimientos se piden antes de tomar o elegir la foto, nunca después. */
  const start = (source: Source) => {
    if (busy || closedReason) return;
    if (missingConsents(consents, 'photo')) setConsentFor(source);
    else run(source, consents);
  };

  // Comunes a la cámara y a la pantalla sin cámara: la galería funciona en las dos.
  const overlays = (
    <>
      {identifying ? (
        <View style={[StyleSheet.absoluteFill, styles.center, { backgroundColor: color.darkScrim }]}
          pointerEvents="none" accessibilityLiveRegion="polite">
          <ActivityIndicator color={color.lime} />
          <Text variant="bodyMedium" tone="onDark">{t.identify.analyzing}</Text>
        </View>
      ) : null}
      <WiloConsentSheet visible={consentFor !== null} need="photo" notice={status?.notice ?? null} initial={consents}
        onDismiss={() => setConsentFor(null)}
        onAccept={(given) => {
          const source = consentFor;
          wiloConsentStore.set(() => given);
          setConsentFor(null);
          if (source) run(source, given);
        }} />
    </>
  );

  // Avisos sobre la foto: abstención de la API, demo cerrada o errores.
  const messages = (
    <>
      {/* Aquí `result` nunca es una especie: esa vuelve antes con IdentifyResult. */}
      {result && result.kind !== 'species' ? (
        <IdentifyMiss result={result} onDismiss={() => setResult(null)} />
      ) : null}
      {closedReason && !notice ? (
        <View style={[styles.notice, { backgroundColor: color.darkScrim, borderColor: color.darkOutline }]}>
          <Text variant="bodySmall" tone="onDark">{closedReason}</Text>
        </View>
      ) : null}
      {notice ? (
        <View style={[styles.notice, { backgroundColor: color.darkScrim, borderColor: color.darkOutline }]}
          accessibilityLiveRegion="polite">
          <Text variant="bodySmall" tone="onDark">{notice}</Text>
        </View>
      ) : null}
    </>
  );

  const header = (
    <View style={[styles.header, { paddingTop: insets.top + space.md }]} pointerEvents="box-none">
      <Text variant="display" tone="onDark" accessibilityRole="header">{t.identify.title}</Text>
    </View>
  );

  if (result?.kind === 'species') {
    return <IdentifyResult species={result.species} outcome={result.outcome} onBack={() => setResult(null)} />;
  }

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
        : {
          heading: t.identify.permissionHeading,
          body: IDENTIFY_LIVE ? t.identify.permissionBodyLive : t.identify.permissionBody,
          action: t.identify.permissionAction,
        };
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
          {/* Sin cámara igual se puede identificar una foto de la galería. */}
          {!closedReason ? (
            <Button label={t.identify.gallery} tone="ghost" onPress={() => start('gallery')}
              accessibilityLabel={t.identify.galleryA11y} leading={<GalleryIcon color={color.onDark} size={20} />} />
          ) : null}
          {messages}
        </View>
        {overlays}
      </View>
    );
  }

  const front = facing === 'front';
  return (
    <View style={[styles.screen, { backgroundColor: color.dark }]}>
      {focused ? (
        <CameraView ref={camera} style={StyleSheet.absoluteFill} facing={facing} mode="picture" mute
          onCameraReady={() => setReady(true)} onMountError={() => setFailed(true)} />
      ) : null}
      {header}
      {!ready && !identifying ? (
        <View style={[StyleSheet.absoluteFill, styles.center]} pointerEvents="none">
          <ActivityIndicator color={color.lime} />
          <Text variant="bodyMedium" tone="onDarkVariant">{t.identify.starting}</Text>
        </View>
      ) : null}
      <View style={styles.bottom} pointerEvents="box-none">
        {messages}
        <View style={styles.controls}>
          <View style={styles.side}>
            {/* `start` ignora el toque mientras hay una foto en curso o la demo está cerrada. */}
            <IconButton look="dark" label={t.identify.galleryA11y} onPress={() => start('gallery')}>
              <GalleryIcon color={color.onDark} />
            </IconButton>
          </View>
          <Pressable onPress={() => start('camera')} disabled={!ready || busy || !!closedReason} accessibilityRole="button"
            accessibilityLabel={t.identify.shutterA11y}
            accessibilityState={{ disabled: !ready || busy || !!closedReason, busy }}
            style={[styles.shutter, { borderColor: color.onDark, opacity: !ready || closedReason ? 0.5 : 1 }]}>
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
      {overlays}
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
