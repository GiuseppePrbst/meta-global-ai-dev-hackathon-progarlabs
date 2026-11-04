import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Image, type ImageSourcePropType, Pressable, ScrollView, StyleSheet, View } from 'react-native';
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
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { Species } from '@/domain/species';
import { getReferencePhoto } from '@/features/catalog/reference-photos';
import { Wilo } from '@/features/onboarding/wilo';
import { questionsFor } from '@/features/identify/wilo-chat';
import { t } from '@/i18n/es-CL';
import { CameraIcon, easeOutExpo, IconButton, MicIcon, NAVIGATION_BAR_OVERLAP, radius, space, Text, useTheme } from '@/ui';

// Resultado tras la foto (DEMO, ver wilo-chat.ts): la foto de referencia de la especie reemplaza al
// visor y Wilo conversa sobre ella. El micrófono no graba: solo anima la escucha y Wilo pide repetir.

const TYPING_MS = 750;

type Message = { id: number; from: 'wilo' | 'you'; text: string };

export function IdentifyResult({ species, onBack }: { species: Species; onBack: () => void }) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const photo = getReferencePhoto(species.id);
  const questions = useMemo(() => questionsFor(species), [species]);

  const [messages, setMessages] = useState<Message[]>(() => [
    { id: 0, from: 'wilo', text: t.identify.greeting(species.commonName, species.group === 'fungus') },
  ]);
  const [typing, setTyping] = useState(false);
  const [listening, setListening] = useState(false);
  const [asked, setAsked] = useState<string | null>(null);
  const nextId = useRef(1);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  useEffect(() => () => clearTimeout(timer.current), []);

  // Cada turno: la pregunta entra al tiro y Wilo "escribe" un momento antes de responder.
  const converse = (question: string, answer: string) => {
    clearTimeout(timer.current);
    setMessages((m) => [...m, { id: nextId.current++, from: 'you', text: question }]);
    setTyping(true);
    timer.current = setTimeout(() => {
      setTyping(false);
      setMessages((m) => [...m, { id: nextId.current++, from: 'wilo', text: answer }]);
      AccessibilityInfo.announceForAccessibility(`${t.identify.wilo}: ${answer}`);
    }, reducedMotion ? 0 : TYPING_MS);
  };

  const ask = (id: string) => {
    const q = questions.find((x) => x.id === id);
    if (!q || typing) return;
    setAsked(id);
    converse(q.question, q.answer);
  };

  const toggleMic = () => {
    if (typing) return;
    if (!listening) {
      setListening(true);
      return;
    }
    setListening(false);
    converse(t.identify.voiceAsked, t.identify.voiceAnswer);
  };

  const lastWilo = messages[messages.length - 1]?.from === 'wilo' && messages.length > 1;

  return (
    <View style={[styles.screen, { backgroundColor: color.dark }]}>
      {photo ? <Photo source={photo.source} animate={!reducedMotion} /> : null}
      {/* Velos arriba y abajo para que el texto se lea sobre cualquier foto. */}
      <Veil tint={color.dark} />

      <Animated.View entering={reducedMotion ? undefined : FadeInDown.duration(420).easing(easeOutExpo)}
        style={[styles.header, { paddingTop: insets.top + space.md }]}>
        <View style={styles.headerText}>
          <View style={[styles.foundPill, { backgroundColor: color.lime }]}>
            <Text variant="labelMedium" tone="onLime">{t.identify.found}</Text>
          </View>
          <Text variant="display" tone="onDark" accessibilityRole="header">{species.commonName}</Text>
          <Text variant="scientificLarge" tone="onDarkVariant">{species.scientificName}</Text>
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
                <WiloLine text={m.text} first={i === 0} happy={lastWilo && i === messages.length - 1} />
              ) : (
                <View style={[styles.you, { backgroundColor: color.onDemo }]}>
                  <Text variant="bodyMedium" tone="onDark">{m.text}</Text>
                </View>
              )}
            </Animated.View>
          ))}
          {typing ? <TypingDots /> : null}
        </ScrollView>

        <View accessibilityRole="list" accessibilityLabel={t.identify.suggestions} style={styles.suggestions}>
          {questions.map((q) => {
            const done = asked === q.id;
            return (
              <Pressable key={q.id} onPress={() => ask(q.id)} disabled={typing} accessibilityRole="button"
                accessibilityState={{ disabled: typing, selected: done }}
                style={({ pressed }) => [styles.suggestion, {
                  backgroundColor: done ? color.demo : color.surface,
                  borderColor: done ? color.onDemo : color.outlineVariant,
                  opacity: typing ? 0.55 : pressed ? 0.75 : 1,
                  transform: [{ scale: pressed ? 0.97 : 1 }],
                }]}>
                <Text variant="labelLarge" tone={done ? 'onDemo' : 'onSurface'}>{q.question}</Text>
              </Pressable>
            );
          })}
        </View>
      </Animated.View>

      <View style={[styles.bottom, { paddingBottom: space.lg + NAVIGATION_BAR_OVERLAP }]}>
        <MicButton listening={listening} disabled={typing} onPress={toggleMic} animate={!reducedMotion} />
        <Text variant="labelLarge" tone="onDark" accessibilityLiveRegion="polite">
          {listening ? t.identify.micListening : t.identify.micIdle}
        </Text>
      </View>
    </View>
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

function WiloLine({ text, first, happy }: { text: string; first: boolean; happy: boolean }) {
  const { color } = useTheme();
  return (
    <View style={styles.wiloLine}>
      <View>
        <Wilo pose={first ? 'greet' : happy ? 'happy' : 'sniff'} width={first ? 64 : 44} height={first ? 60 : 40}
          accessibilityLabel={t.identify.wiloA11y} />
      </View>
      <View style={[styles.wiloBubble, { backgroundColor: color.demo }]}>
        <Text variant="labelMedium" tone="onDemo">{t.identify.wilo}</Text>
        <Text variant="bodyMedium">{text}</Text>
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

function MicButton({ listening, disabled, onPress, animate }: { listening: boolean; disabled: boolean; onPress: () => void; animate: boolean }) {
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
      <Pressable onPress={onPress} disabled={disabled} accessibilityRole="button" accessibilityLabel={t.identify.micA11y(listening)}
        accessibilityState={{ disabled, selected: listening }}
        style={({ pressed }) => [styles.mic, {
          backgroundColor: listening ? color.onLime : color.lime,
          borderColor: listening ? color.lime : 'rgba(255,255,255,0.35)',
          opacity: disabled ? 0.6 : 1,
          transform: [{ scale: pressed ? 0.92 : 1 }],
        }]}>
        <MicIcon color={listening ? color.lime : color.onLime} size={30} />
      </Pressable>
    </View>
  );
}

const MIC = 72;

const styles = StyleSheet.create({
  screen: { flex: 1, overflow: 'hidden' },
  photo: { width: '100%', height: '100%' },
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: space.lg, gap: space.md },
  headerText: { flex: 1, gap: space.xs },
  foundPill: { alignSelf: 'flex-start', paddingHorizontal: space.sm + 2, paddingVertical: space.xxs + 1, borderRadius: radius.full, marginBottom: space.xs },
  spacer: { flex: 1, minHeight: space.lg },
  card: {
    marginHorizontal: space.md, borderRadius: radius.xl, padding: space.md, gap: space.md, maxHeight: '58%',
    elevation: 6, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 1, shadowRadius: 24,
  },
  thread: { flexGrow: 0 },
  threadContent: { gap: space.sm },
  wiloLine: { flexDirection: 'row', alignItems: 'flex-end', gap: space.sm },
  wiloBubble: { flex: 1, padding: space.md, paddingTop: space.sm, borderRadius: radius.lg, borderBottomLeftRadius: space.xs, gap: space.xxs },
  you: { alignSelf: 'flex-end', maxWidth: '82%', paddingHorizontal: space.md, paddingVertical: space.sm + 2, borderRadius: radius.lg, borderBottomRightRadius: space.xs },
  typing: { flexDirection: 'row', alignSelf: 'flex-start', marginLeft: 52, gap: 5, paddingHorizontal: space.md, paddingVertical: space.md, borderRadius: radius.lg },
  dot: { width: 7, height: 7, borderRadius: 4 },
  suggestions: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  suggestion: { paddingHorizontal: space.md, paddingVertical: space.sm + 2, borderRadius: radius.full, borderWidth: 1 },
  bottom: { alignItems: 'center', gap: space.sm, paddingTop: space.lg },
  micWrap: { width: MIC, height: MIC, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: MIC, height: MIC, borderRadius: MIC / 2, borderWidth: 2 },
  mic: { width: MIC, height: MIC, borderRadius: MIC / 2, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
});
