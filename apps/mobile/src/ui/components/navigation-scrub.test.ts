import { describe, expect, it } from '@jest/globals';

import { highlightLeft, scrubIndex, slotCenter } from '@/ui/components/navigation-scrub';

describe('scrubIndex', () => {
  // Barra de 416 de ancho con 8 de relleno lateral: 4 destinos de 100.
  it('devuelve el destino bajo el dedo', () => {
    expect(scrubIndex(10, 416, 4, 8)).toBe(0);
    expect(scrubIndex(150, 416, 4, 8)).toBe(1);
    expect(scrubIndex(320, 416, 4, 8)).toBe(3);
  });

  it('se ajusta a los extremos cuando el dedo sale de la barra', () => {
    expect(scrubIndex(-50, 416, 4, 8)).toBe(0);
    expect(scrubIndex(900, 416, 4, 8)).toBe(3);
  });

  it('no falla sin medir o sin destinos', () => {
    expect(scrubIndex(100, 0, 4, 8)).toBe(0);
    expect(scrubIndex(100, 416, 0, 8)).toBe(-1);
  });
});

describe('slotCenter', () => {
  it('ubica el centro de cada destino', () => {
    expect(slotCenter(0, 416, 4, 8)).toBe(58);
    expect(slotCenter(3, 416, 4, 8)).toBe(358);
  });
});

describe('highlightLeft', () => {
  it('centra el resaltado en el punto dado', () => {
    expect(highlightLeft(208, 116, 416, 4)).toBe(150);
  });

  it('no deja que el resaltado salga de la barra', () => {
    expect(highlightLeft(58, 116, 416, 4)).toBe(4);
    expect(highlightLeft(400, 116, 416, 4)).toBe(296);
  });
});
