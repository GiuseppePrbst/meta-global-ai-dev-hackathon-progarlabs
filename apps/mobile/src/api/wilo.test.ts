import { describe, expect, it, jest } from '@jest/globals';

import type { FetchLike } from '@/api/client';
import { guideQueryBody, postGuideQuery, toWiloReply, transcribeForm, WILO_LIVE } from '@/api/wilo';
import type { WiloConsents } from '@/domain/wilo';

// Datos SINTÉTICOS; el transporte es un espía, nada sale a la red.
const given: WiloConsents = { adult: true, externalProcessing: true, rights: true };

describe('modo por defecto', () => {
  it('sin EXPO_PUBLIC_WILO_LIVE=true, Wilo usa el mock', () => {
    expect(WILO_LIVE).toBe(false);
  });
});

describe('POST /guide/query', () => {
  it('envía exactamente el body del contrato', () => {
    expect(guideQueryBody('¿Pregunta sintética?', given)).toEqual({
      question: '¿Pregunta sintética?',
      adult_confirmed: true,
      external_processing_confirmed: true,
      capture_id: null,
    });
  });

  it('hace POST a /guide/query por el transporte dado y convierte la respuesta', async () => {
    const spy = jest.fn<FetchLike>().mockResolvedValue(new Response(JSON.stringify({
      answer: 'Respuesta sintética', provider: 'meta', execution_status: 'completed', insufficient_evidence: false,
      sources: [{ id: 's1' }], limitations: ['L'], correlation_id: 'c-1',
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const reply = await postGuideQuery(spy, '¿Pregunta sintética?', given);

    const [url, init] = spy.mock.calls[0];
    expect(url).toMatch(/\/guide\/query$/);
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual(guideQueryBody('¿Pregunta sintética?', given));
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(reply).toEqual({
      text: 'Respuesta sintética', simulated: false, insufficientEvidence: false,
      sources: [{ id: 's1' }], limitations: ['L'], correlationId: 'c-1',
    });
  });
});

describe('POST /guide/transcribe', () => {
  it('arma el FormData con el archivo y los tres consentimientos', () => {
    const audio = { uri: 'blob:sintetico', mimeType: 'audio/wav', fileName: 'pregunta.wav', durationMs: 1000 };
    const form = transcribeForm(audio, { ...given, rights: false }, new Blob(['x'], { type: 'audio/wav' }));
    expect(form.getAll('file')).toHaveLength(1);
    expect(form.getAll('adult_confirmed')).toEqual(['true']);
    expect(form.getAll('rights_confirmed')).toEqual(['false']);
    expect(form.getAll('external_processing_confirmed')).toEqual(['true']);
    expect(form.getAll('language_hint')).toEqual(['es']);
  });
});

describe('toWiloReply', () => {
  it('una respuesta mock queda rotulada como simulada y sin campos opcionales no falla', () => {
    expect(toWiloReply({ answer: 'A', provider: 'mock', execution_status: 'mock' } as never)).toMatchObject({
      simulated: true, insufficientEvidence: true, limitations: [], sources: [], correlationId: null,
    });
  });
});
