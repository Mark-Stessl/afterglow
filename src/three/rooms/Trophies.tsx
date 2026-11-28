/**
 * Trophy room after the reference: dark wood panelled walls with a white marble feature wall, lit glass
 * cabinets of gold, silver and bronze cups on both sides, framed shirts in shadow boxes and a framed medal,
 * a black pedestal with a big cup under a spot, four leather lounge chairs on a marble tile floor.
 * Cups are turned from profiles (instanced); chairs, marble and wood are CC0 scans from Poly Haven.
 */
import { Suspense, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Halo, Spill } from '../glow';
import { Model, Surface } from '../models';
import { B, D, H, Led, Pic, Shell, Track, type V3 } from '../parts';
import { DEPTH } from '../scene';
import { jersey, marble, panels } from '../textures';

const WARM = '#ffd9a0';
const METALS = { gold: '#e2b24e', silver: '#d9dee5', bronze: '#c27c48' };

/** Undo the room's depth squash, so what is inside keeps its true shape. */
const True = ({ p, rot = 0, children }: { p: V3; rot?: number; children: ReactNode }) => (
  <group position={p} scale={[1, 1, 1 / DEPTH]}><group rotation={[0, rot, 0]}>{children}</group></group>
);

function RB({ size, p, r = 0.01, mat, rot }: { size: V3; p: V3; r?: number; mat: THREE.Material; rot?: V3 }) {
  const geo = useMemo(() => new RoundedBoxGeometry(...size, 3, Math.min(r, ...size.map(s => s / 2 - 0.0005))), [size, r]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={mat} position={p} rotation={rot} />;
}

/* ---------- cups ---------- */

const lathe = (pts: number[][], seg = 40) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
/** Profiles in metres, base at y = 0. */
const SHAPES = {
  // classic cup: foot, stem with a knot, deep bowl with a rolled lip (handles added separately)
  cup: lathe([[0, 0], [0.055, 0], [0.055, 0.012], [0.035, 0.022], [0.014, 0.035], [0.012, 0.08], [0.022, 0.09], [0.012, 0.1], [0.016, 0.115],
    [0.045, 0.135], [0.068, 0.17], [0.075, 0.21], [0.078, 0.235], [0.083, 0.24], [0.07, 0.24], [0.064, 0.215], [0.055, 0.175], [0, 0.15]]),
  // tall goblet with a flared rim
  goblet: lathe([[0, 0], [0.045, 0], [0.045, 0.01], [0.02, 0.02], [0.009, 0.04], [0.009, 0.16], [0.02, 0.175], [0.04, 0.2], [0.055, 0.25],
    [0.068, 0.3], [0.074, 0.305], [0.062, 0.3], [0.05, 0.255], [0, 0.22]]),
  // a plate on a short stand, tilted towards the room
  plate: lathe([[0, 0], [0.04, 0], [0.04, 0.008], [0.012, 0.02], [0.01, 0.05], [0.09, 0.058], [0.1, 0.066], [0.095, 0.07], [0, 0.062]], 48),
};
const handle = (() => { const g = new THREE.TorusGeometry(0.03, 0.006, 10, 24, Math.PI * 1.1); return g; })();
const metal = new THREE.MeshStandardMaterial({ color: '#ffffff', metalness: 1, roughness: 0.22, envMapIntensity: 1.6 });
const plinth = new THREE.MeshStandardMaterial({ color: '#141210', roughness: 0.35, metalness: 0.2 });

interface Cup { kind: keyof typeof SHAPES; p: V3; s: number; metal: keyof typeof METALS }

/** Many cups of one shape in one draw call each for body, handles and plinths. `fix` undoes the room squash per axis. */
function CupSet({ cups, fix }: { cups: Cup[]; fix: V3 }) {
  const groups = useMemo(() => (Object.keys(SHAPES) as (keyof typeof SHAPES)[]).map(k => ({ kind: k, list: cups.filter(c => c.kind === k) })), [cups]);
  const handles = useMemo(() => cups.filter(c => c.kind === 'cup'), [cups]);
  return (
    <>
      {groups.map(g => g.list.length > 0 && <Instances key={g.kind} geo={SHAPES[g.kind]} mat={metal} list={g.list.map(c => ({ ...c, y: 0.022 * c.s, tilt: g.kind === 'plate' ? -0.5 : 0 }))} fix={fix} />)}
      {[-1, 1].map(side => (
        <Instances key={side} geo={handle} mat={metal} fix={fix}
          list={handles.map(c => ({ ...c, y: 0.022 * c.s + 0.19 * c.s, dx: side * 0.075 * c.s, rz: side > 0 ? -Math.PI / 2 : Math.PI / 2 }))} />
      ))}
      <Instances geo={plinthGeo} mat={plinth} fix={fix} colorless list={cups.map(c => ({ ...c, y: 0.011 * c.s }))} />
    </>
  );
}
const plinthGeo = new RoundedBoxGeometry(0.12, 0.022, 0.12, 2, 0.004);

function Instances({ geo, mat, list, fix, colorless }: {
  geo: THREE.BufferGeometry; mat: THREE.Material; fix: V3; colorless?: boolean;
  list: (Cup & { y: number; dx?: number; rz?: number; tilt?: number })[];
}) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const m = ref.current!;
    const o = new THREE.Object3D();
    const c = new THREE.Color();
    list.forEach((it, i) => {
      o.position.set(it.p[0] + (it.dx || 0) * fix[0], it.p[1] + it.y, it.p[2]);
      o.rotation.set(it.tilt || 0, 0, it.rz || 0);
      o.scale.set(it.s * fix[0], it.s * fix[1], it.s * fix[2]);
      o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, c.set(colorless ? '#ffffff' : METALS[it.metal]));
    });
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  }, [list, fix]);
  return <instancedMesh ref={ref} args={[geo, mat, list.length]} />;
}

/* ---------- cabinets ---------- */

const wood = new THREE.MeshStandardMaterial({ color: '#2a1a10', roughness: 0.45, metalness: 0.05 });
const glass = new THREE.MeshPhysicalMaterial({ color: '#e8f4f2', roughness: 0.04, metalness: 0, transparent: true, opacity: 0.1, envMapIntensity: 2, clearcoat: 1, depthWrite: false });
const brass = new THREE.MeshStandardMaterial({ color: '#b89050', metalness: 1, roughness: 0.3 });

/**
 * A lit glass cabinet, facing +z: wooden frame with rounded edges, a back panel washed in warm light under each
 * shelf's LED, glass shelves, two glass doors with brass pulls, and cups of every kind and metal.
 */
function Cabinet({ w, h, shelves, seed, fix }: { w: number; h: number; shelves: number; seed: number; fix: V3 }) {
  const gap = (h - 0.3) / shelves;
  const cups = useMemo(() => {
    const out: Cup[] = [];
    const kinds: Cup['kind'][] = ['cup', 'goblet', 'cup', 'plate'];
    const metals: Cup['metal'][] = ['gold', 'gold', 'silver', 'bronze', 'gold'];
    for (let s = 0; s < shelves; s++) {
      const n = 3 + ((s + seed) % 2);
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + ((i + 0.5) * w) / n;
        const k = 0.85 + ((i * 7 + s * 3 + seed) % 5) * 0.09;
        out.push({ kind: kinds[(i + s + seed) % kinds.length], p: [x, 0.21 + s * gap, -0.02], s: Math.min(k, (gap - 0.06) / 0.33), metal: metals[(i * 3 + s + seed) % metals.length] });
      }
    }
    return out;
  }, [w, shelves, seed, gap]);
  return (
    <group>
      {/* frame */}
      <RB size={[w + 0.1, h, 0.04]} p={[0, h / 2, -0.2]} r={0.01} mat={wood} />
      {[-1, 1].map(x => <RB key={x} size={[0.05, h, 0.42]} p={[x * (w / 2 + 0.03), h / 2, 0]} r={0.012} mat={wood} />)}
      <RB size={[w + 0.12, 0.07, 0.44]} p={[0, h, 0]} r={0.015} mat={wood} />
      <RB size={[w + 0.12, 0.18, 0.44]} p={[0, 0.09, 0]} r={0.015} mat={wood} />
      {/* shelves with their light */}
      {Array.from({ length: shelves }, (_, s) => (
        <group key={s}>
          <mesh position={[0, 0.2 + s * gap, 0]} material={glass}><boxGeometry args={[w, 0.015, 0.36]} /></mesh>
          <Led p={[0, 0.2 + (s + 1) * gap - 0.035, 0.17]} s={[w - 0.05, 0.01, 0.01]} color={WARM} k={2.2} />
          <Spill p={[0, 0.2 + (s + 1) * gap - 0.2, -0.177]} size={[w, 0.36]} dir="down" color={WARM} strength={0.3} />
        </group>
      ))}
      <CupSet cups={cups} fix={fix} />
      {/* glass doors with a slim brass meeting rail and pulls */}
      <mesh position={[0, h / 2 + 0.04, 0.21]} material={glass}><boxGeometry args={[w, h - 0.22, 0.008]} /></mesh>
      <RB size={[0.012, h - 0.22, 0.012]} p={[0, h / 2 + 0.04, 0.215]} r={0.004} mat={brass} />
      {[-1, 1].map(x => <RB key={`p${x}`} size={[0.01, 0.12, 0.012]} p={[x * 0.03, h / 2, 0.225]} r={0.004} mat={brass} />)}
    </group>
  );
}

/* ---------- framed things ---------- */

/** A shirt in a deep shadow box: black frame, a backing board, the shirt standing off it, glass in front. */
function ShadowBox({ p, rot, size, map }: { p: V3; rot?: V3; size: [number, number]; map: THREE.Texture }) {
  const [fw, fh] = size;
  return (
    <group position={p} rotation={rot}>
      <B p={[0, 0, 0.02]} s={[fw, fh, 0.08]} c="#0e0e0f" r={0.4} />
      <B p={[0, 0, 0.061]} s={[fw - 0.06, fh - 0.06, 0.004]} c="#1c1c20" r={0.9} />
      <Pic p={[0, 0, 0.075]} s={[fw - 0.14, fh - 0.12]} map={map} e="#ffffff" ei={0.15} />
      <mesh position={[0, 0, 0.062 + 0.002]}><planeGeometry args={[fw - 0.06, fh - 0.06]} /><meshPhysicalMaterial color="#ffffff" transparent opacity={0.07} roughness={0.03} clearcoat={1} depthWrite={false} /></mesh>
    </group>
  );
}

/** A framed medal on green felt: ribbon in two colours, a struck gold medal with a raised rim. */
function FramedMedal() {
  const medal = useMemo(() => lathe([[0, 0], [0.085, 0], [0.085, 0.006], [0.075, 0.009], [0.07, 0.006], [0.03, 0.008], [0, 0.011]], 48), []);
  return (
    <group>
      <B p={[0, 0, 0]} s={[0.62, 0.74, 0.05]} c="#121212" r={0.4} />
      <B p={[0, 0, 0.026]} s={[0.54, 0.66, 0.004]} c="#1f3a26" r={1} />
      <B p={[-0.055, 0.14, 0.031]} s={[0.07, 0.34, 0.004]} rot={[0, 0, 0.38]} c="#b4202f" r={0.7} />
      <B p={[0.055, 0.14, 0.033]} s={[0.07, 0.34, 0.004]} rot={[0, 0, -0.38]} c="#1e3f9a" r={0.7} />
      <mesh geometry={medal} position={[0, -0.1, 0.034]} rotation={[Math.PI / 2, 0, 0]} material={metal} scale={[1, 1, 1]}>
        <meshStandardMaterial color={METALS.gold} metalness={1} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.03, 0.036]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[0.018, 0.004, 8, 20]} /><meshStandardMaterial color={METALS.gold} metalness={1} roughness={0.25} /></mesh>
    </group>
  );
}

/* ---------- the room ---------- */

export function Trophies({ w }: { w: number }) {
  const tex = useMemo(() => ({
    wall: panels('#3a2616', 'trophy'), marble: marble('marble-wall', '#cfcac2'), floor: marble('marble-floor', '#f1efeb'),
    shirts: [0, 1, 2, 3, 4, 5].map(i => jersey(i)),
  }), []);
  const back = -D / 2;
  const bigCup = useMemo<Cup[]>(() => [{ kind: 'cup', p: [0, 0, 0], s: 2.6, metal: 'gold' }], []);
  const backFix: V3 = [1, 1, 1 / DEPTH];
  const sideFix: V3 = [1 / DEPTH, 1, 1];

  return (
    <group>
      <Shell w={w} floor={{ map: tex.floor, c: '#ffffff', r: 0.25 }} wall={{ map: tex.wall, c: '#a07e62', r: 0.7 }} ceiling="#1f1712" />
      <Suspense fallback={
        <mesh position={[0, H / 2, back + 0.02]}><planeGeometry args={[1.6, H]} /><meshStandardMaterial map={tex.marble} roughness={0.3} /></mesh>
      }>
        <Surface diff="trophies/marble_tiles_diff.webp" nor="trophies/marble_tiles_nor.webp" size={[w, D]} rx={w / 1.2} ry={(D * DEPTH) / 1.2} p={[0, 0.002, 0]} rot={[-Math.PI / 2, 0, 0]} r={0.18} c="#f2efe9" />
        {[[back + 0.004, 0, 0, w], [0, -w / 2 + 0.004, Math.PI / 2, D], [0, w / 2 - 0.004, -Math.PI / 2, D]].map(([z, x, ry, len], i) => (
          <Surface key={i} diff="reading/dark_paneled_wood_diff.webp" nor="reading/dark_paneled_wood_nor.webp" size={[len, H]} rx={(i ? len * DEPTH : len) / 1.6} ry={H / 1.6} p={[x, H / 2, z]} rot={[0, ry, 0]} r={0.6} c="#c89a74" />
        ))}
        {/* the marble feature wall in the middle of the back */}
        <Surface diff="trophies/marble_01_diff.webp" nor="trophies/marble_01_nor.webp" size={[1.6, H]} rx={1} ry={H / 1.6} p={[0, H / 2, back + 0.012]} rot={[0, 0, 0]} r={0.22} c="#f4f1ec" />
      </Suspense>

      {/* framed medal on the marble, lit from above */}
      <group position={[0, 2.75, back + 0.05]}>
        <FramedMedal />
        <Halo p={[0, 0.2, -0.02]} size={[1.2, 1.4]} color={WARM} strength={0.25} />
      </group>

      {/* cabinets: two on the back wall, one along each side wall */}
      <group position={[-1.45, 0, back + 0.25]}><Cabinet w={1.1} h={2.9} shelves={4} seed={1} fix={backFix} /></group>
      <group position={[1.45, 0, back + 0.25]}><Cabinet w={1.1} h={2.9} shelves={4} seed={2} fix={backFix} /></group>
      <group position={[-w / 2 + 0.25, 0, 0.35]} rotation={[0, Math.PI / 2, 0]}><Cabinet w={1.6} h={3.0} shelves={5} seed={3} fix={sideFix} /></group>
      <group position={[w / 2 - 0.25, 0, 0.35]} rotation={[0, -Math.PI / 2, 0]}><Cabinet w={1.6} h={3.0} shelves={5} seed={4} fix={sideFix} /></group>

      {/* framed shirts in shadow boxes high on the walls */}
      {[-1.45, 1.45].map((x, i) => <ShadowBox key={x} p={[x, 3.6, back + 0.02]} size={[0.58, 0.64]} map={tex.shirts[i]} />)}
      {[-1, 1].map(side => [0, 1].map(k => (
        <ShadowBox key={`${side}${k}`} p={[side * (w / 2 - 0.02), 3.55, -1.3 + k * 1.3]} rot={[0, -side * Math.PI / 2, 0]} size={[0.52, 0.6]} map={tex.shirts[2 + k + (side > 0 ? 2 : 0)]} />
      )))}

      {/* black lacquer pedestal with the big cup under its own spot */}
      <group position={[0, 0, back + 1.5]}>
        <True p={[0, 0, 0]}>
          <RB size={[0.46, 1.08, 0.46]} p={[0, 0.54, 0]} r={0.02} mat={plinth} />
          <RB size={[0.5, 0.04, 0.5]} p={[0, 1.1, 0]} r={0.01} mat={brass} />
          <group position={[0, 1.12, 0]}><CupSet cups={bigCup} fix={[1, 1, 1]} /></group>
        </True>
        <Halo p={[0, 0.006, 0.1]} size={[1.2, 1.2]} rot={[-Math.PI / 2, 0, 0]} color={WARM} strength={0.3} />
        <spotLight position={[0, H - 0.2, 0.3]} angle={0.28} penumbra={0.6} intensity={9} distance={5} decay={1.4} color="#fff2d6" />
        <pointLight position={[0, 2.2, 0.6]} color="#fff0d0" intensity={2} distance={2.2} decay={1.8} />
      </group>

      {/* four leather lounge chairs turned towards the pedestal (Poly Haven scan) */}
      <Suspense fallback={null}>
        {([[-1.2, 0.6, 0.75], [-1.0, 1.75, 1.15], [1.2, 0.6, -0.75], [1.0, 1.75, -1.15]] as const).map(([x, z, r], i) => (
          <True key={i} p={[x, 0, z]} rot={r + Math.PI}><Model path="trophies/lounge_chair.glb" p={[0, 0, 0]} s={0.82} /></True>
        ))}
      </Suspense>

      <Track x1={-1.6} x2={1.6} z={0.7} heads={4} />
      <Track x1={-1.6} x2={1.6} z={-1.2} heads={4} />
      <pointLight position={[0, H - 0.5, 0.7]} color="#ffe2b8" intensity={7} distance={8} decay={1.5} />
    </group>
  );
}
