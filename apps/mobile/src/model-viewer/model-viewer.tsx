'use dom';

import { type DOMImperativeFactory, type DOMProps, useDOMImperativeHandle } from 'expo/dom';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

import { TEST_MODEL_OBJ } from '@/model-viewer/test-model';

// Visor 3D con three.js dentro de un Expo DOM component, igual que el mapa (ADR 0002 y 0003). El modelo
// viaja dentro del bundle del WebView: no cruza el puente ni se pide por red. Este archivo no importa
// `@/ui` ni nada que cargue React Native; los colores llegan por props.

export type ModelViewerStatus = 'ready' | 'failed';

export interface ModelViewerHandle extends DOMImperativeFactory {
  /** Vuelve la cámara al encuadre inicial. */
  resetView(): void;
}

export type ModelViewerColors = {
  background: string;
  /** Luz de contorno y brillo del suelo. */
  accent: string;
  /**
   * Color de cada material del OBJ por nombre; el que falta usa `fallback`. `null` oculta las piezas de
   * ese material (p. ej. una lámina que solo tenía sentido con su textura).
   */
  materials: Record<string, string | null>;
  fallback: string;
};

/** Modelos disponibles. Por ahora solo el de prueba; los de especies llegarán por la API. */
export type ModelId = 'test-trophy';

const MODELS: Record<ModelId, string> = { 'test-trophy': TEST_MODEL_OBJ };

type ModelViewerProps = {
  ref: React.Ref<ModelViewerHandle>;
  modelId: ModelId;
  colors: ModelViewerColors;
  reducedMotion: boolean;
  /** Espacio que tapan la cabecera y el pie, para centrar el modelo en lo que queda visible. */
  insets: { top: number; bottom: number };
  onStatus: (status: ModelViewerStatus) => void;
  dom?: DOMProps;
};

/** Alto del modelo en unidades de escena, sea cual sea su tamaño real. */
const MODEL_HEIGHT = 1;
const INTRO_MS = 1100;
/** Tras soltar, cuánto espera el giro automático antes de volver. */
const IDLE_MS = 3500;

const easeOutExpo = (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x));

export default function ModelViewer({ ref, modelId, colors, reducedMotion, insets, onStatus }: ModelViewerProps) {
  const container = useRef<HTMLDivElement>(null);
  const reset = useRef<() => void>(() => {});

  useDOMImperativeHandle(ref, () => ({ resetView: () => reset.current() }), []);

  useEffect(() => {
    const host = container.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    } catch {
      onStatus('failed');
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.display = 'block';
    host.appendChild(renderer.domElement);
    renderer.domElement.addEventListener('webglcontextlost', () => onStatus('failed'));

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(colors.background);
    // La niebla funde el borde del suelo con el fondo; su distancia se ajusta al encuadrar.
    const fog = new THREE.Fog(colors.background, 4, 9);
    scene.fog = fog;

    // Luz de bosque: cielo claro verdoso arriba, suelo oscuro abajo, una luz principal cálida y un
    // contorno lima detrás que recorta la silueta contra el fondo.
    // Un estudio neutro como reflejo, solo para lo brillante (acrílico): en lo mate lavaría los colores.
    const pmrem = new THREE.PMREMGenerator(renderer);
    const studio = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    scene.add(new THREE.HemisphereLight('#EEF3E2', '#1B2620', 1.4));
    const key = new THREE.DirectionalLight('#FFF6E8', 2.4);
    key.position.set(2.2, 3.2, 2.6);
    scene.add(key);
    const rim = new THREE.DirectionalLight(colors.accent, 1.6);
    rim.position.set(-2.4, 1.6, -2.8);
    scene.add(rim);

    // Modelo: se centra, se apoya en el suelo y se escala a un alto fijo.
    const model = new OBJLoader().parse(MODELS[modelId]);
    const materials = new Map<string, THREE.Material>();
    const materialFor = (name: string) => {
      let material = materials.get(name);
      if (!material) {
        const tone = colors.materials[name] ?? colors.fallback;
        // Lo negro brilla como acrílico; el resto es mate. Los vinilos van pegados sobre otra pieza:
        // se adelantan un poco en profundidad para que no parpadeen contra ella.
        const glossy = name.includes('acrilico');
        const decal = name.includes('vinilo');
        material = new THREE.MeshPhysicalMaterial({
          color: tone,
          roughness: glossy ? 0.12 : 0.62,
          metalness: 0,
          clearcoat: glossy ? 1 : 0,
          clearcoatRoughness: 0.08,
          envMap: glossy ? studio : null,
          envMapIntensity: 0.6,
          side: THREE.DoubleSide,
          polygonOffset: decal,
          polygonOffsetFactor: decal ? -2 : 0,
          polygonOffsetUnits: decal ? -4 : 0,
        });
        materials.set(name, material);
      }
      return material;
    };
    model.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const source = Array.isArray(child.material) ? child.material : [child.material];
      if (source.every((m: THREE.Material) => colors.materials[m.name] === null)) {
        child.visible = false;
        return;
      }
      const mapped = source.map((m: THREE.Material) => materialFor(m.name));
      child.material = mapped.length === 1 ? mapped[0] : mapped;
      if (!child.geometry.attributes.normal) child.geometry.computeVertexNormals();
    });
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const scale = MODEL_HEIGHT / (size.y || 1);
    const center = box.getCenter(new THREE.Vector3());
    model.position.set(-center.x * scale, -box.min.y * scale, -center.z * scale);
    model.scale.setScalar(scale);
    const pivot = new THREE.Group();
    pivot.add(model);
    scene.add(pivot);

    // Sombra de contacto: un disco con degradado radial bajo la base, y un halo lima tenue en el suelo.
    const glow = (inner: string, outer: string) => {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 256;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
        g.addColorStop(0, inner);
        g.addColorStop(1, outer);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 256, 256);
      }
      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      return texture;
    };
    const footprint = Math.max(size.x, size.z) * scale;
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(footprint * 1.6, footprint * 1.6),
      new THREE.MeshBasicMaterial({ map: glow('rgba(0,0,0,0.55)', 'rgba(0,0,0,0)'), transparent: true, depthWrite: false }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.001;
    scene.add(shadow);
    const halo = new THREE.Mesh(
      new THREE.PlaneGeometry(3.2, 3.2),
      new THREE.MeshBasicMaterial({ map: glow(`${colors.accent}33`, `${colors.accent}00`), transparent: true, depthWrite: false }),
    );
    halo.rotation.x = -Math.PI / 2;
    scene.add(halo);

    // Cámara: de tres cuartos y un poco desde arriba, a la distancia que deja ver el modelo entero con
    // margen, sea la pantalla vertical u horizontal (se recalcula al cambiar de tamaño).
    const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 50);
    const target = new THREE.Vector3(0, MODEL_HEIGHT * 0.5, 0);
    const direction = new THREE.Vector3(0.5, 0.36, 0.86).normalize();
    const radius = new THREE.Box3().setFromObject(pivot).getBoundingSphere(new THREE.Sphere()).radius;
    const home = new THREE.Vector3();
    const fitHome = () => {
      const vertical = THREE.MathUtils.degToRad(camera.fov) / 2;
      const horizontal = Math.atan(Math.tan(vertical) * camera.aspect);
      const distance = (radius * 1.04) / Math.sin(Math.min(vertical, horizontal));
      home.copy(direction).multiplyScalar(distance).add(target);
      fog.near = distance + radius;
      fog.far = distance + radius * 6;
    };

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.copy(target);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = radius * 1.4;
    controls.maxDistance = radius * 8;
    controls.maxPolarAngle = Math.PI * 0.53; // un poco bajo el horizonte, nunca debajo del suelo
    controls.rotateSpeed = 0.8;
    controls.autoRotate = !reducedMotion;
    controls.autoRotateSpeed = 1.4;

    let idleTimer: ReturnType<typeof setTimeout> | undefined;
    controls.addEventListener('start', () => {
      controls.autoRotate = false;
      if (idleTimer) clearTimeout(idleTimer);
    });
    controls.addEventListener('end', () => {
      if (reducedMotion) return;
      idleTimer = setTimeout(() => { controls.autoRotate = true; }, IDLE_MS);
    });

    // Ajusta el tamaño y desplaza el centro óptico para que el modelo quede en lo visible entre cabecera y pie.
    const resize = () => {
      const width = host.clientWidth || window.innerWidth;
      const height = host.clientHeight || window.innerHeight;
      renderer.setSize(width, height, false);
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';
      camera.aspect = width / height;
      camera.setViewOffset(width, height, 0, (insets.bottom - insets.top) / 2, width, height);
      camera.updateProjectionMatrix();
      fitHome();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    // Momento de entrada: la cámara llega desde lejos y el modelo sube girando hasta asentarse.
    let flight: { from: THREE.Vector3; start: number; ms: number } | null = null;
    const flyHome = (ms: number, from?: THREE.Vector3) => {
      if (reducedMotion || ms === 0) {
        camera.position.copy(home);
        controls.target.copy(target);
        controls.update();
        return;
      }
      flight = { from: (from ?? camera.position).clone(), start: performance.now(), ms };
    };
    const introFrom = home.clone().multiplyScalar(2.2).add(new THREE.Vector3(-1.2, 0.8, 0));
    camera.position.copy(reducedMotion ? home : introFrom);
    let intro = reducedMotion ? 1 : 0;
    const introStart = performance.now();
    flyHome(reducedMotion ? 0 : INTRO_MS, introFrom);

    reset.current = () => {
      if (idleTimer) clearTimeout(idleTimer);
      controls.target.copy(target);
      flyHome(700);
      controls.autoRotate = !reducedMotion;
    };

    let frame = 0;
    let reported = false;
    const tick = (now: number) => {
      if (flight) {
        const t = Math.min((now - flight.start) / flight.ms, 1);
        camera.position.lerpVectors(flight.from, home, easeOutExpo(t));
        if (t >= 1) flight = null;
      }
      if (intro < 1) {
        intro = Math.min((now - introStart) / INTRO_MS, 1);
        const e = easeOutExpo(intro);
        pivot.rotation.y = (1 - e) * -Math.PI * 0.9;
        pivot.position.y = (1 - e) * -0.25;
        pivot.scale.setScalar(0.85 + 0.15 * e);
      }
      controls.update();
      renderer.render(scene, camera);
      if (!reported) {
        reported = true;
        onStatus('ready');
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    // En segundo plano no se dibuja: ahorra batería en terreno.
    const onVisibility = () => {
      cancelAnimationFrame(frame);
      if (!document.hidden) frame = requestAnimationFrame(tick);
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelAnimationFrame(frame);
      if (idleTimer) clearTimeout(idleTimer);
      document.removeEventListener('visibilitychange', onVisibility);
      observer.disconnect();
      controls.dispose();
      scene.traverse((object) => {
        if (object instanceof THREE.Mesh) {
          object.geometry.dispose();
          const list = Array.isArray(object.material) ? object.material : [object.material];
          list.forEach((m: THREE.Material & { map?: THREE.Texture | null }) => { m.map?.dispose(); m.dispose(); });
        }
      });
      studio.dispose();
      renderer.dispose();
      renderer.domElement.remove();
    };
    // Los colores, el modelo y los márgenes se fijan al abrir el visor; no cambian mientras está abierto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <style>{`html, body { margin: 0; height: 100%; background: ${colors.background}; overscroll-behavior: none; overflow: hidden; }`}</style>
      {/* Absoluto: llena el WebView en nativo y el contenedor en web, donde no hay WebView. */}
      <div ref={container} style={{ position: 'absolute', inset: 0 }} />
    </>
  );
}
