import { useState } from 'react';
import { Linking, StyleSheet, Switch, View } from 'react-native';

import { IDENTIFY_LIVE } from '@/api/identify';
import { WILO_LIVE } from '@/api/wilo';
import { NO_CONSENTS, type WiloConsents } from '@/domain/wilo';
import { type ConsentNeed, needsRights, PRIVACY_URL } from '@/features/wilo/wilo-consent';
import { t } from '@/i18n/es-CL';
import { Button, ExternalIcon, Sheet, space, Text, TextButton, useTheme } from '@/ui';

type Props = {
  visible: boolean;
  /** Qué se va a enviar: el audio y la foto piden también los derechos de uso. */
  need: ConsentNeed;
  /** `notice` de GET /demo/status; se muestra tal cual antes de enviar nada. */
  notice: string | null;
  initial: WiloConsents;
  onAccept: (consents: WiloConsents) => void;
  onDismiss: () => void;
};

/**
 * Declaraciones antes del primer envío a Wilo. Cada interruptor empieza apagado (salvo lo que la
 * persona ya aceptó en esta sesión) y «Aceptar y enviar» solo se habilita con todos los necesarios.
 */
export function WiloConsentSheet({ visible, need, notice, initial, onAccept, onDismiss }: Props) {
  const c = t.identify.consent;
  // Se monta de nuevo al abrir (key), así parte de lo ya aceptado y nunca de un estado viejo.
  return (
    <Sheet visible={visible} title={c.title} closeLabel={c.close} onClose={onDismiss}>
      {visible ? (
        <ConsentForm key={need} need={need} notice={notice}
          initial={initial} onAccept={onAccept} />
      ) : null}
    </Sheet>
  );
}

function ConsentForm({ need, notice, initial, onAccept }: Omit<Props, 'visible' | 'onDismiss'>) {
  const c = t.identify.consent;
  const { color } = useTheme();
  const [given, setGiven] = useState<WiloConsents>({ ...NO_CONSENTS, ...initial });
  const rights = needsRights(need);
  const live = need === 'photo' ? IDENTIFY_LIVE : WILO_LIVE;
  const ready = given.adult && given.externalProcessing && (!rights || given.rights);
  const toggle = (key: keyof WiloConsents) => (on: boolean) => setGiven((g) => ({ ...g, [key]: on }));
  return (
    <View style={styles.form}>
      {notice ? <Text variant="bodyMedium" tone="onDark">{notice}</Text> : null}
      {!live ? <Text variant="bodySmall" tone="onDarkVariant">{c.mockNote}</Text> : null}
      <TextButton label={c.privacy} role="link" tone="onDark" onPress={() => void Linking.openURL(PRIVACY_URL)}
        trailing={<ExternalIcon color={color.onDark} size={18} />} />
      <ConsentRow label={c.adult} value={given.adult} onChange={toggle('adult')} />
      <ConsentRow label={need === 'photo' ? c.externalPhoto : need === 'voice' ? c.externalVoice : c.external}
        value={given.externalProcessing} onChange={toggle('externalProcessing')} />
      {rights ? (
        <ConsentRow label={need === 'photo' ? c.rightsPhoto : c.rights} value={given.rights} onChange={toggle('rights')} />
      ) : null}
      <View style={{ opacity: ready ? 1 : 0.5 }} pointerEvents={ready ? 'auto' : 'none'}
        accessibilityState={{ disabled: !ready }}>
        <Button label={c.accept} onPress={() => onAccept(given)} />
      </View>
    </View>
  );
}

function ConsentRow({ label, value, onChange }: { label: string; value: boolean; onChange: (on: boolean) => void }) {
  const { color } = useTheme();
  return (
    <View style={styles.row}>
      <Text variant="bodyMedium" tone="onDark" style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} accessibilityLabel={label}
        trackColor={{ false: color.darkOutline, true: color.lime }}
        thumbColor={value ? color.onLime : color.onDarkVariant}
        ios_backgroundColor={color.darkOutline} />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: space.lg },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  rowLabel: { flex: 1 },
});
