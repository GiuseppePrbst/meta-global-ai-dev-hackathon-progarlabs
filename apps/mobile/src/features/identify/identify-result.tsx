import { useEffect, useRef } from 'react';
import { type ImageSourcePropType, Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeIn,
  FadeInDown,
  FadeInUp,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { IdentifyOutcome } from '@/domain/identification';
import type { Species } from '@/domain/species';
import type { WiloReply } from '@/domain/wilo';
import { getReferencePhoto } from '@/features/catalog/reference-photos';
import { Wilo } from '@/features/onboarding/wilo';
import { useWiloChat } from '@/features/wilo/use-wilo-chat';
import { wiloConsentStore } from '@/features/wilo/wilo-consent';
import { WiloConsentSheet } from '@/features/wilo/wilo-consent-sheet';
import { t } from '@/i18n/es-CL';
import {
  CameraIcon, easeOutExpo, IconButton, MicIcon, NAVIGATION_BAR_OVERLAP, radius, SendIcon, space, Tag, Text, TextButton,
  type, useKeyboardLift, useTheme,
} from '@/ui';

// Resultado tras la foto: la candidata de POST /identify (simulada por defecto, src/api/identify.ts),
// presentada como sugerencia. La foto de referencia de la especie reemplaza al visor y Wilo conversa
// sobre ella. Las preguntas (sugeridas, escritas o por voz)
// van por POST /guide/query, simulado por defecto (src/api/wilo.ts); ver use-wilo-chat.ts.

type Candidate = Extract<IdentifyOutcome, { kind: 'candidate' }>;

export function IdentifyResult({ species, outcome, onBack }: { species: Species; outcome: Candidate; onBack: () => void }) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const photo = getReferencePhoto(species.id);
  const chat = useWiloChat(species);
  const consents = wiloConsentStore.useValue();
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  // Con el teclado abierto, la tarjeta del chat sube hasta quedar sobre él; el micrófono queda tapado.
  const micArea = useRef<React.ComponentRef<typeof View>>(null);
  const keyboardLift = useKeyboardLift(micArea, {
    gap: space.sm,
    reducedMotion,
    onShown: () => scroll.current?.scrollToEnd({ animated: !reducedMotion }),
  });

  const { messages, typing, busy } = chat;
  const lastWilo = messages[messages.length - 1]?.from === 'wilo' && messages.length > 1;
  const canSend = !busy && !chat.closedReason && chat.draft.trim().length > 0;
  const micLabel = chat.transcribing
    ? t.identify.micTranscribing
    : chat.mic.recording ? t.identify.micListening : chat.mic.error ?? chat.closedReason ?? t.identify.micIdle;

  return (
    <Animated.View style={[styles.screen, { backgroundColor: color.dark }, keyboardLift]}>
      {photo ? <Photo source={photo.source} animate={!reducedMotion} /> : null}
      {/* Velos arriba y abajo para que el texto se lea sobre cualquier foto. */}
      <Veil tint={color.dark} />

      <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(420).easing(easeOutExpo)}
        style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <View style={styles.headerText}>
          {/* Siempre una sugerencia (docs/PUBLIC_DEMO.md): nunca «identificada», aunque la API la acepte. */}
          <View style={[styles.foundPill, { backgroundColor: outcome.simulated ? color.provisional : color.lime }]}>
            <Text variant="labelMedium" tone={outcome.simulated ? 'onProvisional' : 'onLime'}>
              {outcome.simulated ? t.identify.foundSimulated : outcome.accepted ? t.identify.found : t.identify.foundCandidate}
            </Text>
          </View>
          <Text variant="display" tone="onDark" accessibilityRole="header">{species.commonName}</Text>
          <Text variant="scientificLarge" tone="onDarkVariant">{species.scientificName}</Text>
          <Text variant="labelSmall" tone="onDark">{t.identify.suggestionNote}</Text>
          {photo ? (
            <Text variant="labelSmall" tone="onDarkVariant" numberOfLines={1}>
              {t.identify.photoCredit(photo.author, photo.license)}
            </Text>
          ) : null}
        </View>
        <IconButton look="dark" label={t.identify.backToCamera} onPress={onBack}>
          <CameraIcon color={color.onDark} />
        </IconButton>
      </Animated.View>

      <View style={styles.spacer} />

      <Animated.View entering={reducedMotion ? undefined : FadeInUp.delay(160).duration(520).easing(easeOutExpo)}
        style={[styles.card, { backgroundColor: color.surface, shadowColor: color.shadow }]}>
        <ScrollView ref={scroll} style={styles.thread} contentContainerStyle={styles.threadContent}
          onContentSizeChange={() => scroll.current?.scrollToEnd({ animated: !reducedMotion })}>
          {messages.map((m, i) => (
            <Animated.View key={m.id} entering={reducedMotion ? undefined : FadeInDown.duration(320).easing(easeOutExpo)}>
              {m.from === 'wilo' ? (
                <WiloLine text={m.text} reply={m.reply} first={i === 0} happy={lastWilo && i === messages.length - 1} />
              ) : m.from === 'error' ? (
                <View style={[styles.error, { backgroundColor: color.provisional }]} accessibilityLiveRegion="polite">
                  <Text variant="bodyMedium" tone="onProvisional">{m.text}</Text>
                  {m.retryQuestion && !busy ? (
                    <TextButton label={t.identify.retry} tone="onProvisional" onPress={() => chat.retry(m.retryQuestion!)} />
                  ) : null}
                </View>
              ) : (
                <View style={[styles.you, { backgroundColor: color.onDemo }]}>
                  <Text variant="bodyMedium" tone="onDark">{m.text}</Text>
                </View>
              )}
            </Animated.View>
          ))}
          {typing ? <TypingDots /> : null}
        </ScrollView>

        {chat.showSuggestions ? (
          <View accessibilityRole="list" accessibilityLabel={t.identify.suggestions} style={styles.suggestions}>
            {chat.questions.map((q) => {
              const disabled = busy || !!chat.closedReason;
              return (
                <Pressable key={q.id} onPress={() => chat.askSuggestion(q.id)} disabled={disabled} accessibilityRole="button"
                  accessibilityState={{ disabled }}
                  style={({ pressed }) => [styles.suggestion, {
                    backgroundColor: color.surface,
                    borderColor: color.outlineVariant,
                    opacity: disabled ? 0.55 : pressed ? 0.75 : 1,
                    transform: [{ scale: pressed ? 0.97 : 1 }],
                  }]}>
                  <Text variant="labelLarge">{q.label}</Text>
                </Pressable>
              );
            })}
          </View>
        ) : null}

        <View style={styles.composerWrap}>
          {chat.draftNote ? <Text variant="labelSmall" tone="onSurfaceVariant">{chat.draftNote}</Text> : null}
          <View style={[styles.composer, { borderColor: color.outlineVariant, backgroundColor: color.surfaceMuted }]}>
            <TextInput value={chat.draft} onChangeText={chat.setDraft} onSubmitEditing={chat.sendDraft}
              placeholder={t.identify.inputPlaceholder} placeholderTextColor={color.onSurfaceVariant}
              accessibilityLabel={t.identify.inputA11y} maxLength={2000} returnKeyType="send" submitBehavior="submit"
              editable={!chat.closedReason} multiline
              style={[styles.input, type.bodyMedium, { color: color.onSurface }]} />
            <Pressable onPress={chat.sendDraft} disabled={!canSend} accessibilityRole="button" accessibilityLabel={t.identify.send}
              accessibilityState={{ disabled: !canSend }}
              style={({ pressed }) => [styles.send, { backgroundColor: color.lime, opacity: canSend ? (pressed ? 0.75 : 1) : 0.45 }]}>
              <SendIcon color={color.onLime} size={20} />
            </Pressable>
          </View>
        </View>
      </Animated.View>

      <View ref={micArea} style={[styles.bottom, { paddingBottom: space.lg + NAVIGATION_BAR_OVERLAP }]}>
        <MicButton listening={chat.mic.recording} processing={chat.transcribing}
          disabled={(busy && !chat.mic.recording) || !chat.voiceOpen}
          onPress={() => void chat.mic.toggle()} animate={!reducedMotion} />
        <Text variant="labelLarge" tone="onDark" accessibilityLiveRegion="polite" style={styles.micLabel}>{micLabel}</Text>
      </View>

      <WiloConsentSheet visible={chat.consent.visible} need={chat.consent.need}
        notice={chat.consent.notice} initial={consents} onAccept={chat.consent.accept} onDismiss={chat.consent.dismiss} />
    </Animated.View>
  );
}

function Photo({ source, animate }: { source: ImageSourcePropType; animate: boolean }) {
  // Entra con un leve acercamiento, como si la cámara enfocara.
  const zoom = useSharedValue(animate ? 1.12 : 1);
  useEffect(() => {
    if (animate) zoom.set(withTiming(1, { duration: 900, easing: easeOutExpo }));
  }, [animate, zoom]);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: zoom.get() }] }));
  return (
    <Animated.View style={[StyleSheet.absoluteFill, style]} entering={animate ? FadeIn.duration(260) : undefined}>
      <Image source={source} style={styles.photo} resizeMode="cover" accessibilityIgnoresInvertColors />
    </Animated.View>
  );
}

function Veil({ tint }: { tint: string }) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" importantForAccessibility="no-hide-descendants">
    <Svg width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={tint} stopOpacity={0.78} />
          <Stop offset="0.32" stopColor={tint} stopOpacity={0.1} />
          <Stop offset="0.6" stopColor={tint} stopOpacity={0.05} />
          <Stop offset="1" stopColor={tint} stopOpacity={0.8} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#veil)" />
    </Svg>
    </View>
  );
}

function WiloLine({ text, reply, first, happy }: { text: string; reply?: WiloReply; first: boolean; happy: boolean }) {
  const { color } = useTheme();
  return (
    <View style={styles.wiloLine}>
      <View>
        <Wilo pose={first ? 'greet' : happy ? 'happy' : 'sniff'} width={first ? 64 : 44} height={first ? 60 : 40}
          accessibilityLabel={t.identify.wiloA11y} />
      </View>
      <View style={[styles.wiloBubble, { backgroundColor: color.demo }]}>
        <View style={styles.wiloHead}>
          <Text variant="labelMedium" tone="onDemo">{t.identify.wilo}</Text>
          {reply?.simulated ? <Tag label={t.identify.simulatedTag} tone="provisional" /> : null}
        </View>
        <Text variant="bodyMedium">{text}</Text>
        {reply?.sources.length ? (
          <Text variant="labelSmall" tone="onDemo">{t.identify.sources(reply.sources.length)}</Text>
        ) : null}
      </View>
    </View>
  );
}

function TypingDots() {
  const { color } = useTheme();
  return (
    <View style={[styles.typing, { backgroundColor: color.demo }]} accessibilityLabel={t.identify.typing}>
      {[0, 1, 2].map((i) => <Dot key={i} delay={i * 140} tint={color.onDemo} />)}
    </View>
  );
}

function Dot({ delay, tint }: { delay: number; tint: string }) {
  const v = useSharedValue(0);
  useEffect(() => {
    v.set(withDelay(delay, withRepeat(withSequence(withTiming(1, { duration: 280 }), withTiming(0, { duration: 280 })), -1)));
    return () => cancelAnimation(v);
  }, [delay, v]);
  const style = useAnimatedStyle(() => ({ opacity: 0.35 + 0.65 * v.get(), transform: [{ translateY: -3 * v.get() }] }));
  return <Animated.View style={[styles.dot, { backgroundColor: tint }, style]} />;
}

type MicButtonProps = {
  listening: boolean;
  /** La grabación se está transcribiendo: anima la carga en vez del micrófono. */
  processing: boolean;
  disabled: boolean;
  onPress: () => void;
  animate: boolean;
};

function MicButton({ listening, processing, disabled, onPress, animate }: MicButtonProps) {
  const { color } = useTheme();
  const pulse = useSharedValue(0);
  useEffect(() => {
    if (!listening || !animate) {
      cancelAnimation(pulse);
      pulse.set(0);
      return;
    }
    pulse.set(withRepeat(withTiming(1, { duration: 1300, easing: Easing.out(Easing.quad) }), -1));
    return () => cancelAnimation(pulse);
  }, [animate, listening, pulse]);
  const ringA = useAnimatedStyle(() => ({ opacity: 0.6 * (1 - pulse.get()), transform: [{ scale: 1 + 0.6 * pulse.get() }] }));
  const ringB = useAnimatedStyle(() => {
    const p = (pulse.get() + 0.5) % 1;
    return { opacity: 0.6 * (1 - p), transform: [{ scale: 1 + 0.6 * p }] };
  });
  return (
    <View style={styles.micWrap}>
      {listening ? (
        <>
          <Animated.View style={[styles.ring, { borderColor: color.lime }, ringA]} pointerEvents="none" />
          <Animated.View style={[styles.ring, { borderColor: color.lime }, ringB]} pointerEvents="none" />
        </>
      ) : null}
      {processing ? <SpinnerArc tint={color.lime} animate={animate} /> : null}
      <Pressable onPress={onPress} disabled={disabled || processing} accessibilityRole="button"
        accessibilityLabel={processing ? t.identify.micTranscribing : t.identify.micA11y(listening)}
        accessibilityState={{ disabled: disabled || processing, selected: listening, busy: processing }}
        style={({ pressed }) => [styles.mic, {
          backgroundColor: listening || processing ? color.onLime : color.lime,
          borderColor: listening || processing ? color.lime : 'rgba(255,255,255,0.35)',
          // Mientras procesa se ve activo, no apagado: está trabajando.
          opacity: disabled && !processing ? 0.6 : 1,
          transform: [{ scale: pressed ? 0.92 : 1 }],
        }]}>
        {processing
          ? <SoundBars tint={color.lime} animate={animate} />
          : <MicIcon color={listening ? color.lime : color.onLime} size={30} />}
      </Pressable>
    </View>
  );
}

/** Arco que gira alrededor del botón mientras se transcribe. Quieto con movimiento reducido. */
function SpinnerArc({ tint, animate }: { tint: string; animate: boolean }) {
  const turn = useSharedValue(0);
  useEffect(() => {
    if (!animate) return;
    turn.set(withRepeat(withTiming(1, { duration: 900, easing: Easing.linear }), -1));
    return () => cancelAnimation(turn);
  }, [animate, turn]);
  const style = useAnimatedStyle(() => ({ transform: [{ rotate: `${turn.get() * 360}deg` }] }));
  const r = (ARC - ARC_STROKE) / 2;
  const length = 2 * Math.PI * r;
  return (
    <Animated.View style={[styles.arc, style]} pointerEvents="none" importantForAccessibility="no-hide-descendants">
      <Svg width={ARC} height={ARC}>
        <Circle cx={ARC / 2} cy={ARC / 2} r={r} stroke={tint} strokeOpacity={0.2} strokeWidth={ARC_STROKE} fill="none" />
        <Circle cx={ARC / 2} cy={ARC / 2} r={r} stroke={tint} strokeWidth={ARC_STROKE} fill="none"
          strokeLinecap="round" strokeDasharray={`${length * 0.28} ${length}`} />
      </Svg>
    </Animated.View>
  );
}

const BAR_COUNT = 4;

/** Barras de sonido que suben y bajan en secuencia, en lugar del micrófono, mientras se transcribe. */
function SoundBars({ tint, animate }: { tint: string; animate: boolean }) {
  return (
    <View style={styles.bars} importantForAccessibility="no-hide-descendants">
      {Array.from({ length: BAR_COUNT }, (_, i) => <SoundBar key={i} delay={i * 120} tint={tint} animate={animate} />)}
    </View>
  );
}

function SoundBar({ delay, tint, animate }: { delay: number; tint: string; animate: boolean }) {
  const level = useSharedValue(0.5);
  useEffect(() => {
    if (!animate) return;
    level.set(withDelay(delay, withRepeat(withSequence(
      withTiming(1, { duration: 320, easing: Easing.inOut(Easing.quad) }),
      withTiming(0.3, { duration: 320, easing: Easing.inOut(Easing.quad) }),
    ), -1)));
    return () => cancelAnimation(level);
  }, [animate, delay, level]);
  const style = useAnimatedStyle(() => ({ transform: [{ scaleY: level.get() }] }));
  return <Animated.View style={[styles.bar, { backgroundColor: tint }, style]} />;
}

const MIC = 72;
/** Diámetro del arco de carga: un poco más grande que el botón. */
const ARC = MIC + 14;
const ARC_STROKE = 3;

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: space.lg, gap: space.md },
  headerText: { flex: 1, gap: space.xs },
  foundPill: { alignSelf: 'flex-start', paddingHorizontal: space.sm + 2, paddingVertical: space.xxs + 1, borderRadius: radius.full, marginBottom: space.xs },
  spacer: { flex: 1, minHeight: space.lg },
  card: {
    marginHorizontal: space.md, borderRadius: radius.xl, padding: space.md, gap: space.md, maxHeight: '58%', flexShrink: 1,
    elevation: 6, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 24,
  },
  // Si falta espacio (teclado abierto), se encoge la conversación, no las sugerencias ni el campo.
  thread: { flexGrow: 0, flexShrink: 1 },
  threadContent: { gap: space.sm },
  wiloLine: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  wiloBubble: { flex: 1, padding: space.md, paddingTop: space.sm, borderRadius: radius.lg, borderBottomLeftRadius: space.xs, gap: space.xxs },
  you: { alignSelf: 'flex-end', maxWidth: '82%', paddingHorizontal: space.md, paddingVertical: space.sm + 2, borderRadius: radius.lg, borderBottomRightRadius: space.xs },
  typing: { flexDirection: 'row', alignSelf: 'flex-start', marginLeft: 52, gap: 5, paddingHorizontal: space.md, paddingVertical: space.md, borderRadius: radius.lg },
  dot: { width: 7, height: 7, borderRadius: 4 },
  wiloHead: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  error: { padding: space.md, borderRadius: radius.lg, gap: space.xs },
  composerWrap: { gap: space.xs },
  composer: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm, borderWidth: 1, borderRadius: radius.lg, paddingLeft: space.md, padding: space.xs },
  input: { flex: 1, maxHeight: 96, paddingVertical: space.sm },
  send: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  micLabel: { textAlign: 'center', paddingHorizontal: space.lg },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  suggestion: { paddingHorizontal: space.md, paddingVertical: space.sm + 2, borderRadius: radius.full, borderWidth: 1 },
  bottom: { alignItems: 'center', gap: space.sm, paddingTop: space.lg },
  micWrap: { width: MIC, height: MIC, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: MIC, height: MIC, borderRadius: MIC / 2, borderWidth: 2 },
  arc: { position: 'absolute', width: ARC, height: ARC },
  bars: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 28 },
  bar: { width: 4, height: 28, borderRadius: 2 },
  mic: { width: MIC, height: MIC, borderRadius: MIC / 2, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
});
