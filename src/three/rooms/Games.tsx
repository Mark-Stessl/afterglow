/**
 * Game room after Mark's reference: lavender walls washed in blue and violet from LED coves, track
 * spots, a wall TV with a blue bias light showing your latest games, an upright white console and
 * controller on a white sideboard, neon shape signs (triangle, circle, cross, square), floating shelves
 * with books and plants, a white desk with a monitor and a gaming chair, navy velvet beanbags and an
 * ottoman on a grey rug over a wood floor.
 * Shapes are built in real metres inside `True` groups so the room's depth squash does not flatten them.
 */
import { useGLTF, useTexture } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import { Suspense, useEffect, useLayoutEffect, useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { store } from '../../data/store';
import type { Item } from '../../data/types';
import { Halo, Spill } from '../glow';
import { Instanced, Model, modelUrl, Surface } from '../models';
import { B, D, H, Led, Shell, Track, type V3 } from '../parts';
import { DEPTH } from '../scene';
import { rng } from '../textures';

const BLUE = '#3f6dff';
const VIOLET = '#9a5cff';
const PINK = '#ff4fd8';
const CYAN = '#5fe3ff';

/** Undo the room's depth squash, so what is inside keeps its true shape. */
const True = ({ p, rot = 0, children }: { p: V3; rot?: number; children: ReactNode }) => (
  <group position={p} scale={[1, 1, 1 / DEPTH]}><group rotation={[0, rot, 0]}>{children}</group></group>
);

function RB({ size, p, r = 0.01, mat, rot }: { size: V3; p: V3; r?: number; mat: THREE.Material; rot?: V3 }) {
  const geo = useMemo(() => new RoundedBoxGeometry(...size, 3, Math.min(r, ...size.map(s => s / 2 - 0.0005))), [size, r]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={mat} position={p} rotation={rot} />;
}

/* ---------- materials ---------- */

const white = new THREE.MeshPhysicalMaterial({ color: '#eceef3', roughness: 0.32, clearcoat: 0.4, clearcoatRoughness: 0.3 });
const whiteMatte = new THREE.MeshStandardMaterial({ color: '#e4e5ea', roughness: 0.6 });
const black = new THREE.MeshStandardMaterial({ color: '#0c0c10', roughness: 0.45 });
const gloss = new THREE.MeshPhysicalMaterial({ color: '#08080b', roughness: 0.15, clearcoat: 1 });
const metal = new THREE.MeshStandardMaterial({ color: '#2a2b30', metalness: 0.8, roughness: 0.35 });

/* ---------- the TV screen: our own home screen with your latest games ---------- */

/** Covers drawn onto a canvas; each cover appears once it has loaded (when its host allows CORS). */
function useHomeScreen(games: Item[]) {
  const invalidate = useThree(s => s.invalidate);
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024; c.height = 576;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }, []);
  useEffect(() => {
    const c = tex.image as HTMLCanvasElement;
    const g = c.getContext('2d')!;
    const r = rng(4);
    // deep blue space with a soft nebula and stars
    const bg = g.createLinearGradient(0, 0, 0, 576);
    bg.addColorStop(0, '#060c2a'); bg.addColorStop(0.6, '#0b1f5c'); bg.addColorStop(1, '#050a22');
    g.fillStyle = bg; g.fillRect(0, 0, 1024, 576);
    const neb = g.createRadialGradient(700, 230, 10, 700, 230, 380);
    neb.addColorStop(0, 'rgba(80,140,255,.55)'); neb.addColorStop(0.5, 'rgba(60,70,200,.18)'); neb.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = neb; g.fillRect(0, 0, 1024, 576);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.7})`; g.fillRect(r() * 1024, r() * 400, r() < 0.9 ? 1.2 : 2.2, r() < 0.9 ? 1.2 : 2.2); }
    // top bar
    g.fillStyle = '#ffffff'; g.font = '600 26px Inter, system-ui, sans-serif'; g.fillText('Games', 48, 58);
    g.fillStyle = 'rgba(255,255,255,.65)'; g.font = '400 26px Inter, system-ui, sans-serif'; g.fillText('Shows', 150, 58);
    g.textAlign = 'right'; g.fillText('22:24', 976, 58); g.textAlign = 'left';
    // centre mark: a glowing ring with a play triangle (Afterglow's own, no console logos)
    g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = 7; g.shadowColor = '#9fc0ff'; g.shadowBlur = 24;
    g.beginPath(); g.arc(512, 250, 46, 0, Math.PI * 2); g.stroke();
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(498, 226); g.lineTo(532, 250); g.lineTo(498, 274); g.fill();
    g.shadowBlur = 0;
    // row of tiles: a "Library" tile, then your latest games
    const tile = (x: number, i: number) => ({ x, y: 400, w: 112, h: 112, i });
    const tiles = [0, 1, 2, 3, 4, 5, 6].map(i => tile(48 + i * 128, i));
    const drawTile = (t: { x: number; y: number; w: number; h: number; i: number }) => {
      const hue = (t.i * 47) % 360;
      g.fillStyle = `hsl(${hue} 45% 32%)`; g.fillRect(t.x, t.y, t.w, t.h);
    };
    tiles.forEach(drawTile);
    g.fillStyle = '#1a3a9a'; g.fillRect(48, 400, 112, 112);
    g.fillStyle = '#ffffff'; g.font = '600 18px Inter, system-ui, sans-serif'; g.fillText('Library', 70, 492);
    g.strokeStyle = '#ffffff'; g.lineWidth = 4; g.strokeRect(46, 398, 116, 116);
    tex.needsUpdate = true;
    games.slice(0, 6).forEach((it, k) => {
      if (!it.cover) return;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const t = tiles[k + 1];
          const s = Math.max(t.w / img.width, t.h / img.height);
          g.save(); g.beginPath(); g.rect(t.x, t.y, t.w, t.h); g.clip();
          g.drawImage(img, t.x + (t.w - img.width * s) / 2, t.y + (t.h - img.height * s) / 2, img.width * s, img.height * s);
          g.restore();
          g.getImageData(0, 0, 1, 1); // throws if the image tainted the canvas
          tex.needsUpdate = true;
          invalidate();
        } catch { /* keep the coloured tile */ }
      };
      img.src = it.cover.startsWith('data:') ? it.cover : it.cover + (it.cover.includes('?') ? '&' : '?') + 'cors=1';
    });
    // "+" tile at the end
    g.fillStyle = 'rgba(255,255,255,.12)'; g.fillRect(48 + 7 * 128, 430, 52, 52);
    g.fillStyle = '#ffffff'; g.fillRect(48 + 7 * 128 + 24, 442, 4, 28); g.fillRect(48 + 7 * 128 + 12, 454, 28, 4);
  }, [tex, games, invalidate]);
  useEffect(() => () => tex.dispose(), [tex]);
  return tex;
}

/** The monitor wallpaper: violet mountains in layered haze. */
function mountainTex() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 288;
  const g = c.getContext('2d')!;
  const sky = g.createLinearGradient(0, 0, 0, 288);
  sky.addColorStop(0, '#2a2f6e'); sky.addColorStop(0.6, '#8d7fc8'); sky.addColorStop(1, '#d8b6e0');
  g.fillStyle = sky; g.fillRect(0, 0, 512, 288);
  const r = rng(12);
  ['#6a64a8', '#4a4888', '#302f66', '#1c1c44'].forEach((col, layer) => {
    g.fillStyle = col;
    g.beginPath(); g.moveTo(0, 288);
    let y = 150 + layer * 30;
    for (let x = 0; x <= 512; x += 16) { y = Math.max(90 + layer * 28, Math.min(260, y + (r() - 0.5) * (60 - layer * 8))); g.lineTo(x, y); }
    g.lineTo(512, 288); g.fill();
  });
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- neon shapes ---------- */

/** One neon tube between two points. */
function Tube({ a, b, color }: { a: [number, number]; b: [number, number]; color: string }) {
  const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return (
    <mesh position={[(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, 0]} rotation={[0, 0, Math.atan2(b[1] - a[1], b[0] - a[0]) - Math.PI / 2]}>
      <capsuleGeometry args={[0.011, len, 4, 10]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

/** Triangle, circle, cross and square in neon, with their glow on the wall. */
function NeonShapes() {
  const s = 0.1; // half size
  const k = 1.6; // brightness for bloom
  const c = (hex: string) => new THREE.Color(hex).multiplyScalar(k);
  const tri = c(CYAN), circ = c(PINK), cross = c('#8fb4ff'), sq = c(PINK);
  return (
    <group>
      <group position={[-0.39, 0, 0]}>
        <Tube a={[-s, -s * 0.85]} b={[s, -s * 0.85]} color={`#${tri.getHexString()}`} />
        <Tube a={[-s, -s * 0.85]} b={[0, s * 0.95]} color={`#${tri.getHexString()}`} />
        <Tube a={[s, -s * 0.85]} b={[0, s * 0.95]} color={`#${tri.getHexString()}`} />
      </group>
      <mesh position={[-0.13, 0, 0]}><torusGeometry args={[s, 0.011, 10, 48]} /><meshBasicMaterial color={circ} toneMapped={false} /></mesh>
      <group position={[0.13, 0, 0]}>
        <Tube a={[-s * 0.85, -s * 0.85]} b={[s * 0.85, s * 0.85]} color={`#${cross.getHexString()}`} />
        <Tube a={[-s * 0.85, s * 0.85]} b={[s * 0.85, -s * 0.85]} color={`#${cross.getHexString()}`} />
      </group>
      <group position={[0.39, 0, 0]}>
        <Tube a={[-s, -s]} b={[s, -s]} color={`#${sq.getHexString()}`} />
        <Tube a={[s, -s]} b={[s, s]} color={`#${sq.getHexString()}`} />
        <Tube a={[s, s]} b={[-s, s]} color={`#${sq.getHexString()}`} />
        <Tube a={[-s, s]} b={[-s, -s]} color={`#${sq.getHexString()}`} />
      </group>
      <Halo p={[0, 0, -0.01]} size={[1.3, 0.55]} color={VIOLET} strength={0.35} />
    </group>
  );
}

/* ---------- furniture ---------- */

/** Smooth extruded solid from a 2D outline, with rounded (bevelled) edges. */
function extruded(shape: THREE.Shape, depth: number, bevel: number, segs = 5) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: segs, curveSegments: 24 });
  g.translate(0, 0, -depth / 2);
  g.computeVertexNormals();
  return g;
}

/**
 * Upright white console (about 39 cm tall): two white wings that flare out towards the top in a soft
 * curve, a gloss-black core between them with a vent grille and a blue light along each gap, on a round stand.
 */
function Console() {
  const wing = useMemo(() => {
    // front-view outline of the right wing: narrow at the foot, curving outwards to a wide top
    const s = new THREE.Shape();
    s.moveTo(0.034, 0.012);
    s.lineTo(0.046, 0.012);
    s.bezierCurveTo(0.05, 0.14, 0.06, 0.29, 0.082, 0.384);
    s.quadraticCurveTo(0.083, 0.392, 0.074, 0.392);
    s.lineTo(0.05, 0.392);
    s.bezierCurveTo(0.042, 0.3, 0.036, 0.15, 0.034, 0.012);
    return extruded(s, 0.24, 0.006);
  }, []);
  const vents = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 32; c.height = 256;
    const g = c.getContext('2d')!; g.fillStyle = '#0b0b0e'; g.fillRect(0, 0, 32, 256);
    g.fillStyle = '#1d1d24'; for (let y = 4; y < 256; y += 6) g.fillRect(4, y, 24, 2);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(2.2), toneMapped: false }), []);
  return (
    <group>
      {/* stand and the black core */}
      <mesh position={[0, 0.006, 0]} material={black}><cylinderGeometry args={[0.07, 0.075, 0.012, 32]} /></mesh>
      <RB size={[0.066, 0.37, 0.245]} p={[0, 0.198, 0]} r={0.012} mat={gloss} />
      <mesh position={[0, 0.2, 0.1235]}><planeGeometry args={[0.05, 0.3]} /><meshStandardMaterial map={vents} roughness={0.6} /></mesh>
      {/* the two white wings, the left one mirrored */}
      <mesh geometry={wing} material={white} />
      <mesh geometry={wing} material={white} scale={[-1, 1, 1]} />
      {/* blue light along the gaps between core and wings, and a disc drive slot */}
      {[-1, 1].map(x => <mesh key={x} position={[x * 0.035, 0.2, 0.1245]} material={glow}><boxGeometry args={[0.0025, 0.3, 0.002]} /></mesh>)}
      <mesh position={[0.06, 0.05, 0.127]} material={black}><boxGeometry args={[0.002, 0.08, 0.001]} /></mesh>
    </group>
  );
}

/**
 * Wireless gamepad in white and black (about 16 cm wide): a bevelled body with two grips, a black face
 * plate, a white touchpad with a blue light bar, two thumbsticks, a D-pad and four face buttons.
 */
function Controller() {
  const body = useMemo(() => {
    // top-view outline: the front edge, then each grip sweeping back towards the player
    const s = new THREE.Shape();
    s.moveTo(-0.05, -0.03);
    s.bezierCurveTo(-0.02, -0.036, 0.02, -0.036, 0.05, -0.03);
    s.bezierCurveTo(0.072, -0.028, 0.08, -0.012, 0.079, 0.01);
    s.bezierCurveTo(0.078, 0.04, 0.074, 0.064, 0.06, 0.07);
    s.bezierCurveTo(0.046, 0.075, 0.038, 0.06, 0.034, 0.042);
    s.bezierCurveTo(0.03, 0.03, 0.012, 0.026, 0, 0.026);
    s.bezierCurveTo(-0.012, 0.026, -0.03, 0.03, -0.034, 0.042);
    s.bezierCurveTo(-0.038, 0.06, -0.046, 0.075, -0.06, 0.07);
    s.bezierCurveTo(-0.074, 0.064, -0.078, 0.04, -0.079, 0.01);
    s.bezierCurveTo(-0.08, -0.012, -0.072, -0.028, -0.05, -0.03);
    const g = extruded(s, 0.018, 0.009, 6);
    g.rotateX(Math.PI / 2); // lay it flat: outline in x/z, thickness up
    return g;
  }, []);
  const face = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-0.046, -0.006);
    s.bezierCurveTo(-0.02, -0.01, 0.02, -0.01, 0.046, -0.006);
    s.bezierCurveTo(0.06, -0.003, 0.064, 0.02, 0.058, 0.034);
    s.bezierCurveTo(0.05, 0.046, 0.04, 0.04, 0.034, 0.03);
    s.bezierCurveTo(0.024, 0.02, -0.024, 0.02, -0.034, 0.03);
    s.bezierCurveTo(-0.04, 0.04, -0.05, 0.046, -0.058, 0.034);
    s.bezierCurveTo(-0.064, 0.02, -0.06, -0.003, -0.046, -0.006);
    const g = extruded(s, 0.002, 0.002, 3);
    g.rotateX(Math.PI / 2);
    return g;
  }, []);
  const glow = useMemo(() => new THREE.MeshBasicMaterial({ color: new THREE.Color(BLUE).multiplyScalar(2), toneMapped: false }), []);
  const grey = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8a8c94', roughness: 0.4, metalness: 0.2 }), []);
  const top = 0.02; // upper surface height
  return (
    <group rotation={[0, 0.25, 0]}>
      <mesh geometry={body} material={white} position={[0, 0.011, 0]} />
      <mesh geometry={face} material={black} position={[0, top + 0.001, 0.008]} />
      {/* touchpad with its light bar */}
      <RB size={[0.05, 0.004, 0.03]} p={[0, top + 0.004, -0.012]} r={0.002} mat={white} />
      {[-1, 1].map(x => <mesh key={x} position={[x * 0.027, top + 0.003, -0.012]} material={glow}><boxGeometry args={[0.002, 0.002, 0.026]} /></mesh>)}
      {/* thumbsticks: a post with a dished cap */}
      {[-1, 1].map(x => (
        <group key={`s${x}`} position={[x * 0.022, top + 0.003, 0.016]}>
          <mesh position={[0, 0.004, 0]} material={black}><cylinderGeometry args={[0.005, 0.006, 0.008, 16]} /></mesh>
          <mesh position={[0, 0.009, 0]} material={black}><cylinderGeometry args={[0.009, 0.0085, 0.003, 24]} /></mesh>
          <mesh position={[0, 0.0106, 0]} rotation={[Math.PI / 2, 0, 0]} material={grey}><torusGeometry args={[0.007, 0.0012, 6, 24]} /></mesh>
        </group>
      ))}
      {/* D-pad on the left, four face buttons on the right */}
      <group position={[-0.05, top + 0.003, -0.002]}>
        <RB size={[0.018, 0.003, 0.006]} p={[0, 0.0015, 0]} r={0.0012} mat={grey} />
        <RB size={[0.006, 0.003, 0.018]} p={[0, 0.0015, 0]} r={0.0012} mat={grey} />
      </group>
      {[[0, -0.009], [0.009, 0], [0, 0.009], [-0.009, 0]].map(([x, z], i) => (
        <mesh key={`b${i}`} position={[0.05 + x, top + 0.004, -0.002 + z]} material={grey}><cylinderGeometry args={[0.0038, 0.0038, 0.003, 16]} /></mesh>
      ))}
    </group>
  );
}

/** Gaming chair: five-star base on casters, gas lift, bucket seat, tall back with side bolsters, mesh insert. */
function GamingChair({ leather }: { leather: THREE.Material }) {
  const mesh = useMemo(() => new THREE.MeshStandardMaterial({ color: '#1c1d26', roughness: 0.9 }), []);
  return (
    <group>
      {[0, 1, 2, 3, 4].map(i => {
        const a = (i / 5) * Math.PI * 2;
        return (
          <group key={i} rotation={[0, a, 0]}>
            <RB size={[0.04, 0.04, 0.32]} p={[0, 0.085, 0.16]} r={0.012} mat={metal} />
            <mesh position={[0, 0.03, 0.31]} material={black}><sphereGeometry args={[0.03, 12, 10]} /></mesh>
          </group>
        );
      })}
      <mesh position={[0, 0.25, 0]} material={metal}><cylinderGeometry args={[0.025, 0.035, 0.3, 16]} /></mesh>
      <RB size={[0.52, 0.11, 0.5]} p={[0, 0.46, 0]} r={0.045} mat={leather} />
      {[-1, 1].map(x => <RB key={x} size={[0.08, 0.06, 0.46]} p={[x * 0.24, 0.53, 0]} r={0.03} mat={leather} />)}
      {/* armrests */}
      {[-1, 1].map(x => (
        <group key={`a${x}`}>
          <RB size={[0.04, 0.22, 0.04]} p={[x * 0.3, 0.6, -0.02]} r={0.01} mat={black} />
          <RB size={[0.08, 0.03, 0.24]} p={[x * 0.3, 0.72, -0.04]} r={0.012} mat={black} />
        </group>
      ))}
      {/* back, tilted a little, with bolsters, mesh insert and a headrest pillow */}
      <group position={[0, 0.5, 0.22]} rotation={[-0.12, 0, 0]}>
        <RB size={[0.5, 0.86, 0.1]} p={[0, 0.48, 0]} r={0.05} mat={leather} />
        {[-1, 1].map(x => <RB key={x} size={[0.09, 0.7, 0.12]} p={[x * 0.23, 0.42, -0.03]} r={0.04} mat={leather} />)}
        <RB size={[0.26, 0.5, 0.012]} p={[0, 0.42, 0.052]} r={0.005} mat={mesh} />
        <RB size={[0.28, 0.12, 0.08]} p={[0, 0.8, -0.07]} r={0.04} mat={leather} />
      </group>
    </group>
  );
}

/**
 * A beanbag as it sits after use: a wide, heavy base resting flat on the floor, a softer, narrower top
 * slumping back, a seat hollow, sewn panel seams running down from the top, the fabric bunching into
 * small creases near the floor, and darker shading (vertex colours) in the hollow, seams and creases.
 */
function beanbagGeometry(seed: number) {
  const g = new THREE.SphereGeometry(1, 128, 80);
  const pos = g.attributes.position as THREE.BufferAttribute;
  const colors = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3();
  const ph = seed * 1.7;
  const PANELS = 8;
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    let { x, y, z } = v;
    const a = Math.atan2(z, x);
    let shade = 1;
    // flat underneath, the filling bulging out just above the floor
    if (y < -0.55) y = -0.55 - (y + 0.55) * 0.08;
    const low = Math.max(0, 1 - Math.abs(y + 0.35) / 0.65);
    const spread = 1 + 0.22 * low;
    const up = Math.max(0, y);
    const narrow = 1 - 0.18 * up;
    // broad soft folds around, strongest at mid height
    const fold = 1 + 0.045 * Math.sin(a * 5 + ph) * (1 - Math.abs(y)) + 0.03 * Math.sin(a * 3 - ph) * low;
    // panel seams: a narrow pinch along each meridian, fading out towards the floor
    const toSeam = Math.abs(((a / (Math.PI * 2 / PANELS)) % 1 + 1) % 1 - 0.5) * 2; // 1 on a seam, 0 mid-panel
    const seam = Math.pow(toSeam, 18) * Math.max(0, y + 0.4);
    // small creases where the fabric bunches near the floor
    const crease = 0.018 * Math.sin(a * 23 + ph * 3 + y * 6) * Math.max(0, 1 - Math.abs(y + 0.45) / 0.25);
    const k = spread * narrow * fold * (1 - 0.03 * seam) * (1 + crease);
    x *= k; z *= k;
    z += 0.18 * up * up;
    // the seat hollow, towards the front
    const hollow = up * Math.exp(-((x * x) / 0.22 + ((z + 0.15) * (z + 0.15)) / 0.3));
    y -= 0.42 * hollow;
    shade -= 0.35 * hollow + 0.35 * seam + 6 * Math.max(0, -crease) + 0.25 * Math.max(0, -(y + 0.45)) * 4;
    pos.setXYZ(i, x, (y + 0.55) * 0.78, z);
    const s = Math.max(0.45, Math.min(1, shade));
    colors[i * 3] = colors[i * 3 + 1] = colors[i * 3 + 2] = s;
  }
  g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/** The scanned ottoman (Poly Haven "Ottoman_01"), re-covered in the room's navy velvet; its own creases and stitching stay. */
function VelvetOttoman({ velvet }: { velvet: THREE.MeshPhysicalMaterial }) {
  const { scene } = useGLTF(modelUrl('games/ottoman_01.glb'));
  const obj = useMemo(() => {
    const o = scene.clone(true);
    o.traverse(n => {
      const m = n as THREE.Mesh;
      if (!m.isMesh) return;
      const src = m.material as THREE.MeshStandardMaterial;
      const mat = velvet.clone();
      mat.vertexColors = false; // the shading colours belong to the beanbags; the scan has none
      if (src.normalMap) { mat.normalMap = src.normalMap; mat.normalScale = new THREE.Vector2(1.3, 1.3); }
      if (src.aoMap) mat.aoMap = src.aoMap;
      m.material = mat;
    });
    return o;
  }, [scene, velvet]);
  return <primitive object={obj} scale={0.72} />;
}

/** Navy velvet (scanned, Poly Haven) for beanbags and ottoman, black leather for the chair. */
function Soft({ children }: { children: (m: { velvet: THREE.MeshPhysicalMaterial; leather: THREE.Material }) => ReactNode }) {
  const [vd, vn, ld, ln] = useTexture([
    modelUrl('cinema/velour_velvet_diff.webp'), modelUrl('cinema/velour_velvet_nor.webp'),
    modelUrl('cinema/fabric_leather_02_diff.webp'), modelUrl('cinema/fabric_leather_02_nor.webp'),
  ]);
  const mats = useMemo(() => {
    const prep = (t: THREE.Texture, rep: number, srgb = false) => {
      const c = t.clone(); c.wrapS = c.wrapT = THREE.RepeatWrapping; c.repeat.set(rep, rep);
      if (srgb) c.colorSpace = THREE.SRGBColorSpace; c.needsUpdate = true; return c;
    };
    return {
      // matte fabric: a light sheen only, the weave repeated small; vertex colours shade folds and seams
      velvet: new THREE.MeshPhysicalMaterial({ map: prep(vd, 7, true), normalMap: prep(vn, 7), normalScale: new THREE.Vector2(1.4, 1.4), color: '#4757c4', roughness: 0.95, sheen: 0.55, sheenColor: new THREE.Color('#8592f0'), sheenRoughness: 0.75, vertexColors: true }),
      leather: new THREE.MeshStandardMaterial({ map: prep(ld, 2, true), normalMap: prep(ln, 2), color: '#2a2a32', roughness: 0.45 }),
    };
  }, [vd, vn, ld, ln]);
  return <>{children(mats)}</>;
}

const BOOKS = ['#7a2230', '#2d4a7a', '#c9a227', '#3a6a4a', '#8a3a7a', '#d6d2c8', '#22252e', '#b5462e'];

/** A floating white shelf with an LED strip under its front edge. */
function Shelf({ p, w, led, children }: { p: V3; w: number; led: string; children?: ReactNode }) {
  return (
    <group position={p}>
      <B p={[0, 0, 0]} s={[w, 0.045, 0.26]} c="#eeeef3" r={0.4} />
      <Led p={[0, -0.026, 0.11]} s={[w - 0.04, 0.012, 0.012]} color={led} k={2.6} />
      <Halo p={[0, -0.12, -0.12]} size={[w + 0.6, 0.62]} color={led} strength={0.4} />
      {children}
    </group>
  );
}

/* ---------- the room ---------- */

export function Games({ w }: { w: number }) {
  const back = -D / 2;
  const games = useMemo(() => store.all('game').slice().sort((a, b) => (b.lastPlayed || b.updatedAt || '').localeCompare(a.lastPlayed || a.updatedAt || '')), []);
  const screen = useHomeScreen(games);
  const wallpaper = useMemo(() => mountainTex(), []);
  const bean = useMemo(() => [beanbagGeometry(1), beanbagGeometry(2)], []);
  const books = useMemo(() => {
    const r = rng(31);
    let x = -0.42;
    return Array.from({ length: 9 }, (_, i) => {
      const bw = 0.03 + r() * 0.02, bh = 0.2 + r() * 0.07;
      const it = { p: [x + bw / 2, bh / 2 + 0.023, -0.02] as V3, s: [bw, bh, 0.16] as V3, c: BOOKS[i % BOOKS.length] };
      x += bw + 0.004;
      return it;
    });
  }, []);

  return (
    <group>
      <Shell w={w} floor={{ c: '#6e5a48', r: 0.6 }} wall={{ c: '#3c3a62', r: 0.92 }} back={{ c: '#3a3860', r: 0.92 }} ceiling="#25234a" />
      <Suspense fallback={null}>
        <Surface diff="games/wood_floor_diff.webp" nor="games/wood_floor_nor.webp" size={[w, D]} rx={w / 1.6} ry={(D * DEPTH) / 1.6} p={[0, 0.002, 0]} rot={[-Math.PI / 2, 0, 0]} r={0.5} c="#a08a76" />
        {/* grey wool rug in the middle */}
        <Surface diff="cinema/poly_wool_herringbone_diff.webp" nor="cinema/poly_wool_herringbone_nor.webp" size={[2.9, 2.6]} rx={3} ry={2.6 * DEPTH} p={[-0.1, 0.006, 1.25]} rot={[-Math.PI / 2, 0, 0]} r={1} c="#6a6878" />
      </Suspense>

      {/* LED coves where the walls meet the ceiling: blue on the left, violet on the right, and their wash */}
      <Led p={[0, H - 0.04, back + 0.04]} s={[w, 0.04, 0.04]} color={BLUE} k={3.2} />
      <Led p={[-w / 2 + 0.04, H - 0.04, 0]} s={[0.04, 0.04, D]} color={BLUE} k={3.2} />
      <Led p={[w / 2 - 0.04, H - 0.04, 0]} s={[0.04, 0.04, D]} color={VIOLET} k={3} />
      <Spill p={[0, H - 0.7, back + 0.005]} size={[w, 1.4]} dir="down" color={BLUE} strength={0.28} />
      <Spill p={[-w / 2 + 0.005, H - 0.8, 0]} size={[D, 1.6]} rot={[0, Math.PI / 2, 0]} dir="down" color={BLUE} strength={0.3} />
      <Spill p={[w / 2 - 0.005, H - 0.8, 0]} size={[D, 1.6]} rot={[0, -Math.PI / 2, 0]} dir="down" color={VIOLET} strength={0.3} />
      {/* skirting LED along the side walls */}
      <Led p={[-w / 2 + 0.03, 0.04, 0.4]} s={[0.02, 0.02, D - 0.8]} color="#cfd8ff" k={1.8} />
      <Led p={[w / 2 - 0.03, 0.04, 0.4]} s={[0.02, 0.02, D - 0.8]} color="#cfd8ff" k={1.8} />
      <Track x1={-1.1} x2={1.1} z={0.3} heads={3} color="#e2d8ff" />

      {/* wall TV with a blue bias light, showing your latest games */}
      <group position={[-0.55, 2.15, back + 0.04]}>
        <Halo p={[0, 0, 0]} size={[3.4, 2.2]} color={BLUE} strength={0.75} />
        <B p={[0, 0, 0.03]} s={[2.36, 1.36, 0.05]} c="#050507" r={0.25} />
        <mesh position={[0, 0, 0.057]}><planeGeometry args={[2.3, 1.3]} /><meshBasicMaterial map={screen} toneMapped={false} /></mesh>
      </group>

      {/* white sideboard with drawers, console, controller, speaker and a game stack */}
      <group position={[-0.75, 0, back + 0.33]}>
        <B p={[0, 0.48, 0]} s={[2.5, 0.42, 0.46]} c="#e6e7ec" r={0.35} />
        <B p={[0.42, 0.48, 0.232]} s={[0.005, 0.4, 0.005]} c="#b9bac2" />
        <B p={[0.42 + 0.62, 0.48, 0.232]} s={[0.005, 0.4, 0.005]} c="#b9bac2" />
        <B p={[0.73, 0.48, 0.232]} s={[0.62, 0.005, 0.005]} c="#b9bac2" />
        <B p={[0, 0.13, -0.02]} s={[2.4, 0.26, 0.38]} c="#cfd0d8" r={0.5} />
        <Spill p={[0, 0.12, 0.25]} size={[2.6, 0.5]} rot={[-Math.PI / 2, 0, 0]} dir="down" color="#cfd8ff" strength={0.2} />
        <True p={[-1.0, 0.69, 0]}><Console /></True>
        <True p={[-0.6, 0.69, 0.05]}><Controller /></True>
        <True p={[0.45, 0.69, 0]}>
          <mesh position={[0, 0.11, 0]} material={black}><cylinderGeometry args={[0.055, 0.06, 0.22, 24]} /></mesh>
          <mesh position={[0, 0.221, 0]}><cylinderGeometry args={[0.045, 0.045, 0.002, 24]} /><meshBasicMaterial color={new THREE.Color(BLUE).multiplyScalar(1.5)} toneMapped={false} /></mesh>
        </True>
        <True p={[0.05, 0.69, 0.05]} rot={0.2}>
          {[0, 1, 2].map(i => <RB key={i} size={[0.17, 0.016, 0.135]} p={[0, 0.008 + i * 0.017, 0]} r={0.003} mat={i === 1 ? whiteMatte : black} />)}
        </True>
      </group>

      {/* neon shapes and floating shelves on the right of the back wall */}
      <group position={[1.2, 2.45, back + 0.04]}><NeonShapes /></group>
      <Shelf p={[0.95, 3.05, back + 0.13]} w={1.0} led={VIOLET}>
        <Suspense fallback={<>{books.map((b, i) => <B key={i} p={b.p} s={b.s} c={b.c} r={0.6} />)}</>}>
          {/* the scanned leather set from the reading nook, one row standing, a second set lying on top */}
          <Instanced path="reading/book_encyclopedia_set_01.glb" items={[
            { p: [-0.47, 0.024, -0.1], s: 0.9 },
            { p: [0.17, 0.024, -0.02], rot: [0, 0, Math.PI / 2], s: 0.42, tint: '#8fa6e0' },
          ]} />
        </Suspense>
        <Suspense fallback={null}><Model path="reading/potted_plant_02.glb" p={[0.33, 0.023, 0]} s={0.42} /></Suspense>
      </Shelf>
      <Shelf p={[1.3, 2.05, back + 0.13]} w={1.0} led={PINK}>
        <B p={[0.05, 0.05, 0]} s={[0.22, 0.06, 0.14]} c="#16161c" r={0.5} />
        <Suspense fallback={null}><Model path="reading/potted_plant_02.glb" p={[0.38, 0.023, 0]} s={0.36} /></Suspense>
      </Shelf>

      {/* white desk with drawers, a monitor with a mountain wallpaper, and the gaming chair */}
      <group position={[w / 2 - 0.95, 0, back + 0.5]}>
        <B p={[0, 0.75, 0]} s={[1.45, 0.045, 0.62]} c="#efeff4" r={0.35} />
        <B p={[-0.5, 0.37, 0]} s={[0.4, 0.74, 0.58]} c="#e6e7ec" r={0.4} />
        {[0.2, 0.42, 0.6].map(y => <B key={y} p={[-0.5, y, 0.292]} s={[0.36, 0.004, 0.004]} c="#b9bac2" />)}
        <B p={[0.68, 0.37, 0]} s={[0.04, 0.74, 0.58]} c="#e6e7ec" r={0.4} />
        <True p={[0.05, 0.775, -0.12]}>
          <RB size={[0.92, 0.42, 0.025]} p={[0, 0.33, 0]} r={0.008} mat={black} />
          <mesh position={[0, 0.33, 0.0135]}><planeGeometry args={[0.88, 0.38]} /><meshBasicMaterial map={wallpaper} toneMapped={false} /></mesh>
          <RB size={[0.05, 0.12, 0.04]} p={[0, 0.07, -0.02]} r={0.01} mat={metal} />
          <RB size={[0.26, 0.012, 0.16]} p={[0, 0.006, 0]} r={0.005} mat={metal} />
        </True>
        <Halo p={[0.05, 1.1, -0.3]} size={[1.6, 0.9]} color={VIOLET} strength={0.3} />
      </group>

      <Suspense fallback={
        <>
          <B p={[w / 2 - 0.85, 0.5, back + 1.25]} s={[0.52, 0.12, 0.5]} c="#16161c" />
          <B p={[w / 2 - 0.85, 0.98, back + 1.5]} s={[0.5, 0.86, 0.12]} c="#17171e" />
        </>
      }>
        <Soft>
          {({ velvet, leather }) => (
            <>
              <True p={[w / 2 - 0.85, 0, back + 1.3]} rot={Math.PI - 0.35}><GamingChair leather={leather} /></True>
              {/* beanbags and ottoman with a remote */}
              <True p={[1.15, 0, 1.25]} rot={-0.6}><mesh geometry={bean[0]} material={velvet} scale={0.55} /></True>
              <True p={[-1.35, 0, 2.15]} rot={0.7}><mesh geometry={bean[1]} material={velvet} scale={0.6} /></True>
              <True p={[-0.25, 0, 0.95]}>
                <VelvetOttoman velvet={velvet} />
                <RB size={[0.18, 0.02, 0.05]} p={[0.05, 0.455, 0]} r={0.008} mat={whiteMatte} rot={[0, 0.3, 0]} />
              </True>
            </>
          )}
        </Soft>
      </Suspense>

      <pointLight position={[-0.9, 3.4, 0.5]} color="#8095ff" intensity={5.5} distance={8} decay={1.5} />
      <pointLight position={[1.4, 3.3, 0.2]} color="#b07dff" intensity={4} distance={6} decay={1.6} />
      <pointLight position={[-0.55, 2.1, back + 0.9]} color="#5a7dff" intensity={3} distance={3.5} decay={1.8} />
      <pointLight position={[0, 2.2, 2.2]} color="#9fb0ff" intensity={1.8} distance={5} decay={1.8} />
    </group>
  );
}
