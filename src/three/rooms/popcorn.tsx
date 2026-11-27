/**
 * The cinema's popcorn cart, after a classic red kettle machine: lacquered cabinet on caster wheels,
 * chrome trim, a glass case with a hanging steel kettle and warm light, a hipped roof with a sign,
 * and a heap of puffy, irregular popcorn (a few lumpy shapes, instanced, in cream to golden tones).
 * Built in real metres and kept true to shape inside the room's depth squash.
 */
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { V3 } from '../parts';
import { DEPTH } from '../scene';
import { rng } from '../textures';

/* ---------- materials ---------- */

const lacquer = new THREE.MeshPhysicalMaterial({ color: '#b0101a', roughness: 0.28, metalness: 0.05, clearcoat: 1, clearcoatRoughness: 0.12 });
const lacquerDark = new THREE.MeshPhysicalMaterial({ color: '#7e0b12', roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 });
const chrome = new THREE.MeshStandardMaterial({ color: '#dfe3e8', metalness: 1, roughness: 0.12, envMapIntensity: 1.6 });
const steel = new THREE.MeshStandardMaterial({ color: '#d4d8de', metalness: 0.9, roughness: 0.2, envMapIntensity: 2.2 });
const rubber = new THREE.MeshStandardMaterial({ color: '#141416', roughness: 0.85 });
const glass = new THREE.MeshPhysicalMaterial({
  color: '#ffffff', roughness: 0.03, metalness: 0, transparent: true, opacity: 0.12, envMapIntensity: 2.2,
  clearcoat: 1, clearcoatRoughness: 0.02, depthWrite: false, side: THREE.DoubleSide,
});

/** A rounded box mesh. */
function RB({ size, p, r = 0.012, mat, rot }: { size: V3; p: V3; r?: number; mat: THREE.Material; rot?: V3 }) {
  const geo = useMemo(() => new RoundedBoxGeometry(...size, 3, r), [size, r]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={mat} position={p} rotation={rot} />;
}

/** A cylinder along y. */
function Cyl({ r, h, p, mat, seg = 24, rt, rot }: { r: number; h: number; p: V3; mat: THREE.Material; seg?: number; rt?: number; rot?: V3 }) {
  return <mesh position={p} rotation={rot} material={mat}><cylinderGeometry args={[rt ?? r, r, h, seg]} /></mesh>;
}

/* ---------- popcorn ---------- */

/**
 * A popped kernel: 3–5 overlapping puffs (the "butterfly" shape), with lumpy noise on every vertex
 * so no two lobes are smooth spheres. Unit size, about 1 across.
 */
function kernelGeometry(seed: number) {
  const r = rng(seed);
  const lobes: THREE.BufferGeometry[] = [];
  const n = 3 + Math.floor(r() * 3);
  for (let i = 0; i < n; i++) {
    const g = new THREE.IcosahedronGeometry(0.32 + r() * 0.16, 2);
    const a = (i / n) * Math.PI * 2 + r() * 0.8;
    g.translate(Math.cos(a) * 0.22, (r() - 0.5) * 0.2, Math.sin(a) * 0.22);
    lobes.push(g);
  }
  const g = mergeGeometries(lobes.map(l => l.toNonIndexed()))!;
  const pos = g.attributes.position as THREE.BufferAttribute;
  const v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    // low-frequency bumps plus fine crinkles
    const bump = 1 + 0.16 * Math.sin(v.x * 9 + seed) * Math.sin(v.y * 8 - seed) * Math.sin(v.z * 10 + seed * 2) + (r() - 0.5) * 0.05;
    v.multiplyScalar(bump);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  g.computeVertexNormals();
  return g;
}

const KERNELS = [0, 1, 2, 3].map(i => kernelGeometry(11 + i * 7));
const kernelMat = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.88, emissive: '#5a3a10', emissiveIntensity: 0.35 });
const CREAM = ['#fff8e6', '#fff3d6', '#fbe9c0', '#f6dca0', '#fffaf0', '#f1d08a'];

/** Pieces of popcorn: each item a position, size and turn; split over the kernel shapes. */
interface Piece { p: V3; s: number; rot: V3; c: string }

function Popcorn({ pieces }: { pieces: Piece[] }) {
  const groups = useMemo(() => KERNELS.map((_, k) => pieces.filter((_, i) => i % KERNELS.length === k)), [pieces]);
  return <>{groups.map((list, k) => <KernelSet key={k} geo={KERNELS[k]} list={list} />)}</>;
}

function KernelSet({ geo, list }: { geo: THREE.BufferGeometry; list: Piece[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current!;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    list.forEach((it, i) => {
      o.position.set(...it.p);
      o.rotation.set(...it.rot);
      o.scale.set(it.s, it.s * 0.85, it.s);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(it.c));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [list]);
  return <instancedMesh ref={ref} args={[geo, kernelMat, list.length]} />;
}

/** A heap filling the case floor, highest towards the back, plus a crown spilling over the kettle rim. */
function makePile(seed: number, floor: number, hw: number, hd: number, kettle: V3): Piece[] {
  const r = rng(seed);
  const out: Piece[] = [];
  const piece = (p: V3): Piece => ({
    p, s: 0.018 + r() * 0.01, rot: [r() * 6.3, r() * 6.3, r() * 6.3], c: CREAM[Math.floor(r() * CREAM.length)],
  });
  for (let i = 0; i < 950; i++) {
    const x = (r() * 2 - 1) * hw, z = (r() * 2 - 1) * hd;
    // mound: higher at the back and middle, lower at the front glass
    const top = 0.08 + 0.2 * (1 - Math.abs(x) / hw * 0.6) * (0.55 + 0.45 * ((hd - z) / (2 * hd)));
    out.push(piece([x, floor + Math.pow(r(), 0.8) * top, z]));
  }
  for (let i = 0; i < 26; i++) {
    const a = r() * Math.PI * 2, d = r() * 0.07;
    out.push(piece([kettle[0] + Math.cos(a) * d, kettle[1] + 0.06 + r() * 0.04, kettle[2] + Math.sin(a) * d]));
  }
  return out;
}

/** The "POPCORN" sign under the roof. */
function signTexture() {
  const c = document.createElement('canvas');
  c.width = 512; c.height = 96;
  const g = c.getContext('2d')!;
  g.fillStyle = '#9c0d16'; g.fillRect(0, 0, 512, 96);
  g.strokeStyle = '#f3d27a'; g.lineWidth = 6; g.strokeRect(8, 8, 496, 80);
  g.fillStyle = '#fff4d6';
  g.font = 'bold 60px Georgia, "Times New Roman", serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('POPCORN', 256, 52);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/* ---------- the cart ---------- */

export function PopcornCart({ p }: { p: V3 }) {
  const W = 0.56, Dp = 0.42;                 // footprint
  const cab = { y0: 0.16, h: 0.6 };          // cabinet
  const shelf = cab.y0 + cab.h;              // 0.76
  const glassH = 0.56;
  const top = shelf + 0.03 + glassH;         // underside of the roof band
  const kettle: V3 = [0, top - 0.17, 0.02];
  const pile = useMemo(() => makePile(5, shelf + 0.035, W / 2 - 0.04, Dp / 2 - 0.04, kettle), []); // eslint-disable-line react-hooks/exhaustive-deps
  const sign = useMemo(() => signTexture(), []);
  const roof = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.05, 0.42, 0.17, 4, 1);
    g.rotateY(Math.PI / 4);
    g.scale(1, 1, Dp / W);
    return g;
  }, []);

  return (
    <group position={p} scale={[1, 1, 1 / DEPTH]}>
      {/* caster wheels on chrome forks */}
      {[-1, 1].map(x => [-1, 1].map(z => (
        <group key={`${x}${z}`} position={[x * (W / 2 - 0.06), 0, z * (Dp / 2 - 0.06)]}>
          <Cyl r={0.06} h={0.035} p={[0, 0.06, 0]} rot={[0, 0, Math.PI / 2]} mat={rubber} seg={28} />
          <Cyl r={0.028} h={0.04} p={[0, 0.06, 0]} rot={[0, 0, Math.PI / 2]} mat={chrome} />
          <RB size={[0.05, 0.06, 0.03]} p={[0, 0.12, 0]} r={0.008} mat={chrome} />
        </group>
      )))}
      {/* cabinet: lacquered box, chrome base rail, a recessed door with a handle */}
      <RB size={[W, cab.h, Dp]} p={[0, cab.y0 + cab.h / 2, 0]} r={0.02} mat={lacquer} />
      <RB size={[W + 0.01, 0.025, Dp + 0.01]} p={[0, cab.y0 + 0.012, 0]} r={0.008} mat={chrome} />
      <RB size={[W - 0.1, cab.h - 0.14, 0.012]} p={[0, cab.y0 + cab.h / 2, Dp / 2 + 0.004]} r={0.006} mat={lacquerDark} />
      <RB size={[0.14, 0.018, 0.02]} p={[0, cab.y0 + cab.h - 0.12, Dp / 2 + 0.02]} r={0.008} mat={chrome} />
      {/* shelf under the case, with a chrome lip */}
      <RB size={[W + 0.05, 0.035, Dp + 0.05]} p={[0, shelf + 0.017, 0]} r={0.01} mat={lacquer} />
      <RB size={[W + 0.055, 0.008, Dp + 0.055]} p={[0, shelf + 0.036, 0]} r={0.004} mat={chrome} />

      {/* glass case: red corner posts, four panes, a steel floor tray */}
      {[-1, 1].map(x => [-1, 1].map(z => (
        <RB key={`${x}${z}`} size={[0.03, glassH, 0.03]} p={[x * (W / 2 - 0.015), shelf + 0.035 + glassH / 2, z * (Dp / 2 - 0.015)]} r={0.008} mat={lacquer} />
      )))}
      <RB size={[W - 0.03, 0.006, Dp - 0.03]} p={[0, shelf + 0.038, 0]} r={0.002} mat={steel} />
      <mesh position={[0, shelf + 0.035 + glassH / 2, Dp / 2 - 0.015]} material={glass}><planeGeometry args={[W - 0.03, glassH]} /></mesh>
      <mesh position={[0, shelf + 0.035 + glassH / 2, -Dp / 2 + 0.015]} material={glass}><planeGeometry args={[W - 0.03, glassH]} /></mesh>
      <mesh position={[W / 2 - 0.015, shelf + 0.035 + glassH / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={glass}><planeGeometry args={[Dp - 0.03, glassH]} /></mesh>
      <mesh position={[-W / 2 + 0.015, shelf + 0.035 + glassH / 2, 0]} rotation={[0, Math.PI / 2, 0]} material={glass}><planeGeometry args={[Dp - 0.03, glassH]} /></mesh>

      {/* the popcorn heap, and the kettle hanging from the roof on a chrome rod */}
      <Popcorn pieces={pile} />
      <Cyl r={0.006} h={0.1} p={[0, top - 0.05, 0.02]} mat={chrome} />
      <Cyl r={0.085} rt={0.09} h={0.1} p={kettle} mat={steel} seg={32} />
      <mesh position={[kettle[0], kettle[1] + 0.05, kettle[2]]} rotation={[Math.PI / 2, 0, 0]} material={chrome}><torusGeometry args={[0.09, 0.006, 8, 32]} /></mesh>
      <RB size={[0.02, 0.02, 0.09]} p={[0.1, kettle[1] + 0.02, kettle[2]]} r={0.006} mat={rubber} />
      {/* the warm lamp in the roof lights the heap from above */}
      <pointLight position={[0, top - 0.04, 0.05]} color="#ffc56e" intensity={1.8} distance={1.1} decay={2} />
      <mesh position={[0, top - 0.012, 0]}><boxGeometry args={[W - 0.12, 0.01, 0.06]} /><meshBasicMaterial color="#ffe1a6" toneMapped={false} /></mesh>

      {/* roof band with the sign, hipped roof, chrome finial */}
      <RB size={[W + 0.03, 0.1, Dp + 0.03]} p={[0, top + 0.05, 0]} r={0.012} mat={lacquer} />
      <mesh position={[0, top + 0.05, Dp / 2 + 0.017]}><planeGeometry args={[W - 0.04, 0.08]} /><meshStandardMaterial map={sign} roughness={0.4} emissive="#ffffff" emissiveMap={sign} emissiveIntensity={0.15} /></mesh>
      <mesh geometry={roof} material={lacquer} position={[0, top + 0.1 + 0.085, 0]} />
      <Cyl r={0.012} h={0.06} p={[0, top + 0.3, 0]} mat={chrome} />
      <mesh position={[0, top + 0.345, 0]} material={chrome}><sphereGeometry args={[0.025, 20, 14]} /></mesh>
    </group>
  );
}
