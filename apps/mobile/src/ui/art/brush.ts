// Geometría de la acuarela sin dependencias de render: la usan las manchas SVG de la app y los
// marcadores HTML del mapa (Expo DOM component), que no pueden importar react-native-svg.

/** Generador pseudoaleatorio pequeño (mulberry32): mismo `seed`, misma secuencia. */
export function seeded(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Semilla estable a partir de un texto (p. ej. el id de una especie). */
export function seedOf(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}

type Point = [number, number];

/** Curva suave cerrada que pasa por los puntos (Catmull-Rom a Bézier cúbica). */
function smoothClosed(points: Point[]) {
  const n = points.length;
  const at = (i: number) => points[(i + n) % n];
  let d = `M${at(0)[0].toFixed(2)},${at(0)[1].toFixed(2)}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    const c1: Point = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Point = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(2)},${c1[1].toFixed(2)} ${c2[0].toFixed(2)},${c2[1].toFixed(2)} ${p2[0].toFixed(2)},${p2[1].toFixed(2)}`;
  }
  return `${d} Z`;
}

/** Contorno de una mancha: una elipse deformada por armónicos con fase aleatoria y algo de ruido. */
export function blobPath(seed: number, cx: number, cy: number, rx: number, ry: number, wobble = 0.14) {
  const rand = seeded(seed);
  const harmonics = [2, 3, 5].map((k) => ({ k, phase: rand() * Math.PI * 2, amp: wobble / k ** 0.6 }));
  const steps = 18;
  const points: Point[] = [];
  for (let i = 0; i < steps; i++) {
    const a = (i / steps) * Math.PI * 2;
    let r = 1 + (rand() - 0.5) * wobble * 0.5;
    for (const { k, phase, amp } of harmonics) r += amp * Math.sin(k * a + phase);
    points.push([cx + rx * r * Math.cos(a), cy + ry * r * Math.sin(a)]);
  }
  return smoothClosed(points);
}

/**
 * Contorno de una hoja de largo `length` con la base abajo y el ápice arriba, centrada en (cx, cy).
 * Cada `seed` cambia la punta, la asimetría de las mitades y el temblor del filo.
 */
export function leafPath(seed: number, cx: number, cy: number, length: number, width: number, wobble = 0.1) {
  const rand = seeded(seed);
  const taper = 0.75 + rand() * 0.35;
  const asym = 0.88 + rand() * 0.24;
  const steps = 9;
  const half = (s: number) => (width / 2) * Math.sin(Math.PI * s ** taper) * (1 + (rand() - 0.5) * wobble);
  const right: Point[] = [];
  for (let i = 0; i <= steps; i++) {
    const s = i / steps;
    right.push([cx + half(s), cy + length / 2 - length * s]);
  }
  const left = right.slice(1, -1).reverse().map(([x, y]): Point => [cx - (x - cx) * asym, y]);
  return smoothClosed([...right, ...left]);
}
