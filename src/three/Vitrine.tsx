/**
 * The display case (lazy chunk): a glass cabinet with lit glass shelves and one platinum cup per
 * platinum game. Each cup carries the game's cover as a medal. Drag to look around the case
 * (limited orbit, no zoom), click a cup to open the game and its trophy list.
 * frameloop="demand": nothing renders while nothing moves.
 */
import { Canvas, useThree, type ThreeEvent } from '@react-three/fiber';
import { Environment, Lightformer, OrbitControls } from '@react-three/drei';
import { Bloom, EffectComposer, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import type { Item } from '../data/types';

export interface Cup { item: Item }

const CELL_W = 0.62;
const SHELF_H = 0.78;
const PLAT = '#e6f0f2';
const LED = new THREE.Color('#bff5ec').multiplyScalar(3);

const hue = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 360; };

/** A medal face painted on a canvas: the cover when the host allows it, else the title's colour and initials. */
function medalTexture(item: Item, onUpdate: () => void) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const h = hue(item.title);
  const grad = g.createRadialGradient(90, 80, 10, 128, 128, 180);
  grad.addColorStop(0, `hsl(${h} 50% 45%)`);
  grad.addColorStop(1, `hsl(${(h + 40) % 360} 45% 14%)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  g.fillStyle = 'rgba(255,255,255,.9)';
  g.font = 'bold 84px Space Grotesk, system-ui, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(item.title.split(/\s+/).slice(0, 2).map(w => w[0] || '').join('').toUpperCase(), 128, 136);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (item.cover) {
    // covers only show when their host sends CORS headers; otherwise the initials stay
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const s = Math.min(img.width, img.height);
        g.drawImage(img, (img.width - s) / 2, (img.height - s) / 4, s, s, 0, 0, 256, 256);
        g.getImageData(0, 0, 1, 1); // throws when the image tainted the canvas
        tex.needsUpdate = true;
        onUpdate();
      } catch { /* keep the initials */ }
    };
    // a separate URL: the page's own <img> copies are cached without CORS and would taint the canvas
    img.src = item.cover.startsWith('data:') ? item.cover : item.cover + (item.cover.includes('?') ? '&' : '?') + 'cors=1';
  }
  return tex;
}

/** Cup profile turned on a lathe: foot, stem, knot, bowl with a rolled lip. */
const CUP = (() => {
  const p = [[0, 0], [0.11, 0], [0.11, 0.025], [0.07, 0.04], [0.03, 0.06], [0.025, 0.16], [0.045, 0.18], [0.025, 0.2], [0.03, 0.23],
    [0.09, 0.27], [0.135, 0.34], [0.15, 0.42], [0.155, 0.47], [0.165, 0.48], [0.14, 0.48], [0.13, 0.43], [0.11, 0.35], [0, 0.3]];
  return new THREE.LatheGeometry(p.map(([x, y]) => new THREE.Vector2(x, y)), 40);
})();

function TrophyCup({ cup, pos, onPick }: { cup: Cup; pos: [number, number, number]; onPick: (id: string) => void }) {
  const invalidate = useThree(s => s.invalidate);
  const [hover, setHover] = useState(false);
  const tex = useMemo(() => medalTexture(cup.item, invalidate), [cup.item, invalidate]);
  useEffect(() => () => tex.dispose(), [tex]);
  useEffect(() => {
    document.body.style.cursor = hover ? 'pointer' : '';
    invalidate();
    return () => { document.body.style.cursor = ''; };
  }, [hover, invalidate]);

  const over = (e: ThreeEvent<PointerEvent>) => { e.stopPropagation(); setHover(true); };
  return (
    <group position={[pos[0], pos[1] + (hover ? 0.03 : 0), pos[2]]}
      onPointerOver={over} onPointerOut={() => setHover(false)}
      onClick={e => { e.stopPropagation(); onPick(cup.item.id); }}>
      {/* black plinth */}
      <mesh position={[0, 0.03, 0]}><boxGeometry args={[0.26, 0.06, 0.26]} /><meshStandardMaterial color="#111" roughness={0.35} /></mesh>
      <mesh geometry={CUP} position={[0, 0.06, 0]}>
        <meshStandardMaterial color={PLAT} metalness={0.95} roughness={hover ? 0.18 : 0.26} envMapIntensity={hover ? 2.2 : 1.5} side={THREE.DoubleSide} />
      </mesh>
      {/* handles */}
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * 0.15, 0.46, 0]} rotation={[0, 0, s * 0.3]}>
          <torusGeometry args={[0.055, 0.011, 10, 24, Math.PI]} />
          <meshStandardMaterial color={PLAT} metalness={1} roughness={0.2} />
        </mesh>
      ))}
      {/* the game as a medal on the bowl */}
      <group position={[0, 0.43, 0.15]} rotation={[-0.12, 0, 0]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.088, 0.088, 0.012, 32]} /><meshStandardMaterial color={PLAT} metalness={1} roughness={0.25} /></mesh>
        <mesh position={[0, 0, 0.0065]} rotation={[0, 0, 0]}>
          <circleGeometry args={[0.075, 32]} />
          <meshStandardMaterial map={tex} roughness={0.5} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.25} />
        </mesh>
      </group>
    </group>
  );
}

function Cabinet({ rows, cols }: { rows: number; cols: number }) {
  const w = cols * CELL_W + 0.1, h = rows * SHELF_H + 0.25, d = 0.62;
  const glass = useMemo(() => new THREE.MeshStandardMaterial({ color: '#cfe8e4', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.09, envMapIntensity: 2, depthWrite: false }), []);
  const wood = '#24170e';
  return (
    <group>
      {/* back panel, softly lit */}
      <mesh position={[0, h / 2, -d / 2]}><boxGeometry args={[w, h, 0.03]} /><meshStandardMaterial color="#1a1410" roughness={0.8} emissive="#3a2a1a" emissiveIntensity={0.25} /></mesh>
      {/* frame */}
      {[-1, 1].map(s => <mesh key={s} position={[s * (w / 2 + 0.03), h / 2, 0]}><boxGeometry args={[0.06, h + 0.1, d]} /><meshStandardMaterial color={wood} roughness={0.5} /></mesh>)}
      <mesh position={[0, h + 0.06, 0]}><boxGeometry args={[w + 0.12, 0.12, d + 0.04]} /><meshStandardMaterial color={wood} roughness={0.5} /></mesh>
      <mesh position={[0, -0.1, 0]}><boxGeometry args={[w + 0.12, 0.2, d + 0.04]} /><meshStandardMaterial color={wood} roughness={0.5} /></mesh>
      {/* glass shelves with a warm LED strip under the front edge */}
      {Array.from({ length: rows }, (_, r) => (
        <group key={r} position={[0, r * SHELF_H, 0]}>
          <mesh material={glass}><boxGeometry args={[w, 0.02, d - 0.04]} /></mesh>
          <mesh position={[0, SHELF_H - 0.03, d / 2 - 0.06]}><boxGeometry args={[w - 0.04, 0.012, 0.012]} /><meshBasicMaterial color={LED} toneMapped={false} /></mesh>
        </group>
      ))}
      {/* front glass doors and side glass */}
      <mesh position={[0, h / 2, d / 2]} material={glass}><boxGeometry args={[w, h, 0.01]} /></mesh>
      <mesh position={[0, h / 2, d / 2 + 0.006]}><boxGeometry args={[0.012, h, 0.012]} /><meshStandardMaterial color="#b9b2a5" metalness={1} roughness={0.3} /></mesh>
    </group>
  );
}

/** The orbit controls block every touch gesture; let vertical swipes scroll the page again, sideways drags still turn the case. */
function PanY() {
  const events = useThree(s => s.events);
  const gl = useThree(s => s.gl);
  useEffect(() => {
    const el = (events.connected as HTMLElement | undefined) || gl.domElement;
    const id = requestAnimationFrame(() => { el.style.touchAction = 'pan-y'; });
    return () => cancelAnimationFrame(id);
  });
  return null;
}

function Fit({ rows, cols }: { rows: number; cols: number }) {
  const { camera, size } = useThree();
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera;
    const h = rows * SHELF_H + 0.4, w = cols * CELL_W + 0.4;
    const t = Math.tan(THREE.MathUtils.degToRad(cam.fov / 2));
    const dist = Math.max(h / 2 / t, w / 2 / (t * (size.width / size.height))) * 1.08 + 0.3;
    cam.position.set(0, h / 2, dist);
    cam.updateProjectionMatrix();
  }, [camera, size, rows, cols]);
  return null;
}

/** With frameloop="demand" the first frames can be drawn before shaders and the environment map are ready; draw a few more. */
function Settle() {
  const invalidate = useThree(s => s.invalidate);
  useEffect(() => {
    const ids = [50, 300, 1000, 2500].map(ms => setTimeout(() => invalidate(), ms));
    return () => ids.forEach(clearTimeout);
  }, [invalidate]);
  return null;
}

/** Shelves get wider as the collection grows, so the case stays about as wide as it is tall. */
export const columnsFor = (n: number) => Math.min(10, Math.max(4, Math.ceil(Math.sqrt(n * 1.3))));

export default function Vitrine({ cups, onPick, onReady }: { cups: Cup[]; onPick: (id: string) => void; onReady?: () => void }) {
  const cols = columnsFor(cups.length);
  const rows = Math.max(2, Math.ceil(cups.length / cols));
  const cy = (rows * SHELF_H + 0.25) / 2;
  const place = (i: number): [number, number, number] => {
    const r = rows - 1 - Math.floor(i / cols); // fill from the top shelf down
    const inRow = Math.min(cols, cups.length - Math.floor(i / cols) * cols);
    const c = i % cols;
    return [(c - (inRow - 1) / 2) * CELL_W, r * SHELF_H + 0.01, 0];
  };

  return (
    <Canvas frameloop="demand" dpr={[1, 1.75]} gl={{ antialias: false, powerPreference: 'high-performance' }}
      camera={{ fov: 32, near: 0.1, far: 30 }} onCreated={() => onReady?.()}
      style={{ background: 'transparent' }}>
      <Fit rows={rows} cols={cols} />
      <Settle />
      <ambientLight intensity={0.25} />
      <hemisphereLight args={['#c9e8ff', '#1a120c', 0.5]} />
      {/* a fixed set of lights however many cups there are: one light per cup broke the shader on big collections */}
      <spotLight position={[0, rows * SHELF_H + 1.2, 1.8]} angle={0.8} penumbra={0.9} intensity={8} decay={1} color="#eefcff" />
      <pointLight position={[0, rows * SHELF_H * 0.5, 1.4]} intensity={1.5} decay={1} color="#eefcff" />
      <Environment resolution={128} frames={1} environmentIntensity={1.1}>
        <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 4, 3]} scale={[6, 1.5, 1]} />
        {/* a big soft panel in front, so the polished cups have something bright to mirror */}
        <Lightformer form="rect" intensity={1.2} color="#e8f4ff" position={[0, 1.2, 6]} scale={[8, 4, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#bff5ec" position={[-4, 1, 2]} scale={[2, 5, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#ffd9a0" position={[4, 1, 2]} scale={[2, 5, 1]} />
      </Environment>
      <group position={[0, 0, 0]}>
        <Cabinet rows={rows} cols={cols} />
        {cups.map((cup, i) => <TrophyCup key={cup.item.id} cup={cup} pos={place(i)} onPick={onPick} />)}
      </group>
      <OrbitControls makeDefault target={[0, cy, 0]} enablePan={false} enableZoom={false} enableDamping={!matchMedia("(prefers-reduced-motion: reduce)").matches} dampingFactor={0.12}
        minAzimuthAngle={-0.55} maxAzimuthAngle={0.55} minPolarAngle={Math.PI / 2 - 0.35} maxPolarAngle={Math.PI / 2 + 0.12} />
      <PanY />
      <EffectComposer multisampling={4}>
        <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.2} intensity={0.7} radius={0.6} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}
