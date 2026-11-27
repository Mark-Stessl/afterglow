/**
 * Home cinema after the reference: charcoal room, three stepped frames with warm cove light
 * leading to a bright screen, three rows of black recliners on lit risers, posters with
 * sconces on the side walls, a red popcorn cart at the front right.
 */
import { useTexture } from '@react-three/drei';
import { Suspense, useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { modelUrl, Surface } from '../models';
import { B, Cy, D, Down, H, Led, Many, Pic, Shell, Sp, type V3 } from '../parts';
import { DEPTH } from '../scene';
import { poster, rng, screenScene } from '../textures';

const WARM = '#ffcf8a';

/* ---------- padded leather recliners ---------- */

/** One part of a recliner: a rounded box at an offset from the seat's floor point, tilted around x. */
interface Part { size: V3; radius: number; at: V3; tilt?: number; dark?: boolean }
/** The seat faces the screen (−z); the camera sees its back, so the backrest and headrest carry the detail. */
// boxy home-cinema recliners like the reference: tall square back with a soft top, wide padded arms
const RECLINER: Part[] = [
  { size: [0.58, 0.18, 0.72], radius: 0.03, at: [0, 0.1, 0], dark: true },         // plinth
  { size: [0.5, 0.18, 0.62], radius: 0.07, at: [0, 0.29, -0.03] },                 // seat cushion
  { size: [0.5, 0.22, 0.08], radius: 0.035, at: [0, 0.2, -0.36] },                 // folded footrest
  { size: [0.58, 0.78, 0.24], radius: 0.07, at: [0, 0.68, 0.27], tilt: 0.08 },     // backrest
  { size: [0.5, 0.16, 0.08], radius: 0.05, at: [0, 0.94, 0.17], tilt: 0.08 },      // headrest pad, facing the screen
  { size: [0.5, 0.012, 0.012], radius: 0.005, at: [0, 0.78, 0.4], tilt: 0.08, dark: true }, // stitch line across the back
];
const ARM: Part = { size: [0.13, 0.38, 0.72], radius: 0.05, at: [0, 0.38, 0.01] };

function RoundedParts({ seats, part, mat }: { seats: V3[]; part: Part; mat: THREE.Material }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  const geo = useMemo(() => new RoundedBoxGeometry(...part.size, 3, part.radius), [part]);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    const o = new THREE.Object3D();
    seats.forEach((s, i) => {
      o.position.set(s[0] + part.at[0], s[1] + part.at[1], s[2] + part.at[2]);
      o.rotation.set(part.tilt || 0, 0, 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [seats, part]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return <instancedMesh ref={ref} args={[geo, mat, seats.length]} />;
}

/** Black leather (scanned, Poly Haven) on padded rounded shapes; small steel cupholders on the arms. */
function Recliners({ seats, arms }: { seats: V3[]; arms: V3[] }) {
  const [map, normalMap] = useTexture([modelUrl('cinema/fabric_leather_02_diff.webp'), modelUrl('cinema/fabric_leather_02_nor.webp')]);
  const [leather, dark] = useMemo(() => {
    const m = map.clone(), n = normalMap.clone();
    [m, n].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1.5, 1.5); t.needsUpdate = true; });
    m.colorSpace = THREE.SRGBColorSpace;
    return [
      new THREE.MeshStandardMaterial({ map: m, normalMap: n, color: '#3a3a40', roughness: 0.42, metalness: 0.05 }),
      new THREE.MeshStandardMaterial({ color: '#0c0c0e', roughness: 0.7 }),
    ];
  }, [map, normalMap]);
  const cups = useMemo(() => arms.map(a => [a[0], a[1] + 0.575, a[2] - 0.24] as V3), [arms]);
  return (
    <group>
      {RECLINER.map((p, i) => <RoundedParts key={i} seats={seats} part={p} mat={p.dark ? dark : leather} />)}
      <RoundedParts seats={arms} part={ARM} mat={leather} />
      <Many items={cups.map(p => ({ p, s: [0.07, 0.02, 0.07] as V3 }))} c="#9aa0a8" m={0.9} r={0.25} geo={<cylinderGeometry args={[0.5, 0.5, 1, 16]} />} />
    </group>
  );
}

/** Wool carpet on the floor and the risers, dark velvet on the side walls (both scanned, Poly Haven). */
function Fabrics({ w }: { w: number }) {
  const carpet = { diff: 'cinema/poly_wool_herringbone_diff.webp', nor: 'cinema/poly_wool_herringbone_nor.webp' };
  const velvet = { diff: 'cinema/velour_velvet_diff.webp', nor: 'cinema/velour_velvet_nor.webp' };
  const rw = w - 0.9;
  return (
    <>
      <Surface {...carpet} size={[w, D]} rx={w / 0.9} ry={(D * DEPTH) / 0.9} p={[0, 0.002, 0]} rot={[-Math.PI / 2, 0, 0]} r={1} c="#4a4440" />
      <Surface {...carpet} size={[rw, 2.5]} rx={rw / 0.9} ry={(2.5 * DEPTH) / 0.9} p={[0, 0.352, -0.3]} rot={[-Math.PI / 2, 0, 0]} r={1} c="#4a4440" />
      <Surface {...carpet} size={[rw, 1.2]} rx={rw / 0.9} ry={(1.2 * DEPTH) / 0.9} p={[0, 0.702, -0.95]} rot={[-Math.PI / 2, 0, 0]} r={1} c="#4a4440" />
      <Surface {...velvet} size={[D, H]} rx={(D * DEPTH) / 0.8} ry={H / 0.8} p={[-w / 2 + 0.002, H / 2, 0]} rot={[0, Math.PI / 2, 0]} r={0.9} c="#4a4038" />
      <Surface {...velvet} size={[D, H]} rx={(D * DEPTH) / 0.8} ry={H / 0.8} p={[w / 2 - 0.002, H / 2, 0]} rot={[0, -Math.PI / 2, 0]} r={0.9} c="#4a4038" />
    </>
  );
}

/** A rectangular ring (four bars) with LED strips on its inner edge. */
function Ring({ z, w, h, ow, oh, depth = 0.25 }: { z: number; w: number; h: number; ow: number; oh: number; depth?: number }) {
  const side = (ow - w) / 2, top = oh - h;
  const c = '#24221f';
  return (
    <group position={[0, 0, z]}>
      <B p={[-(w / 2 + side / 2), oh / 2, 0]} s={[side, oh, depth]} c={c} r={0.9} />
      <B p={[w / 2 + side / 2, oh / 2, 0]} s={[side, oh, depth]} c={c} r={0.9} />
      <B p={[0, h + top / 2, 0]} s={[w, top, depth]} c={c} r={0.9} />
      <Led p={[-w / 2 + 0.012, h / 2, depth / 2 - 0.02]} s={[0.025, h, 0.025]} color={WARM} />
      <Led p={[w / 2 - 0.012, h / 2, depth / 2 - 0.02]} s={[0.025, h, 0.025]} color={WARM} />
      <Led p={[0, h - 0.012, depth / 2 - 0.02]} s={[w, 0.025, 0.025]} color={WARM} />
    </group>
  );
}

export function Cinema({ w }: { w: number }) {
  const rows = [
    { z: -0.85, y: 0.7, n: 5 },
    { z: 0.4, y: 0.35, n: 5 },
    { z: 1.65, y: 0, n: 5 },
  ];
  const seats = useMemo(() => {
    const base: { p: V3; s: V3 }[] = [];
    const backs: { p: V3; s: V3 }[] = [];
    const arms: { p: V3; s: V3 }[] = [];
    rows.forEach(r => {
      for (let i = 0; i < r.n; i++) {
        const x = (i - (r.n - 1) / 2) * 0.7;
        base.push({ p: [x, r.y + 0.28, r.z], s: [0.6, 0.3, 0.72] });
        backs.push({ p: [x, r.y + 0.62, r.z + 0.32], s: [0.6, 0.72, 0.2] });
        arms.push({ p: [x - 0.35, r.y + 0.38, r.z + 0.02], s: [0.1, 0.36, 0.7] });
        if (i === r.n - 1) arms.push({ p: [x + 0.35, r.y + 0.38, r.z + 0.02], s: [0.1, 0.36, 0.7] });
      }
    });
    // floor points for the leather recliners: one per seat, a left arm each and a right arm at the row's end
    const points: V3[] = [], armPoints: V3[] = [];
    rows.forEach(r => {
      for (let i = 0; i < r.n; i++) {
        const x = (i - (r.n - 1) / 2) * 0.7;
        points.push([x, r.y, r.z + 0.02]);
        armPoints.push([x - 0.35, r.y, r.z]);
        if (i === r.n - 1) armPoints.push([x + 0.35, r.y, r.z]);
      }
    });
    return { base, backs, arms, points, armPoints };
  }, []);

  const posters = useMemo(() => [0, 1, 2, 3, 4, 5].map(i => poster(20 + i)), []);
  const film = useMemo(() => screenScene(), []);
  // popcorn piled in the glass case
  const popcorn = useMemo(() => {
    const r = rng(9);
    return Array.from({ length: 70 }, () => {
      const s = 0.035 + r() * 0.02;
      return { p: [(r() - 0.5) * 0.42, 0.93 + r() * r() * 0.26, (r() - 0.5) * 0.32] as V3, s: [s, s * 0.85, s] as V3 };
    });
  }, []);

  return (
    <group>
      <Shell w={w} floor={{ c: '#2a2724', r: 0.95 }} wall={{ c: '#2b2926', r: 0.95 }} back={{ c: '#1b1a18', r: 0.95 }} ceiling="#1e1d1b" />

      {/* stepped frames leading to the screen */}
      <Ring z={1.55} w={w - 0.5} h={H - 0.32} ow={w} oh={H} depth={0.3} />
      <Ring z={0.2} w={w - 1.05} h={H - 0.72} ow={w} oh={H} depth={0.3} />
      <Ring z={-1.2} w={w - 1.6} h={H - 1.1} ow={w} oh={H} depth={0.3} />

      {/* screen */}
      <B p={[0, 2.2, -D / 2 + 0.04]} s={[3.36, 1.82, 0.04]} c="#0b0b0b" />
      <mesh position={[0, 2.2, -D / 2 + 0.07]}>
        <planeGeometry args={[3.2, 1.66]} />
        <meshBasicMaterial map={film} toneMapped={false} />
      </mesh>
      {/* wall speakers on the front pillars, as in the reference */}
      {[-1, 1].map(s => (
        <group key={s} position={[s * (w / 2 - 0.27), 2.35, 1.72]} scale={1.25}>
          <B p={[0, 0, 0]} s={[0.27, 0.5, 0.06]} c="#121214" r={0.45} />
          <B p={[0, 0, 0.031]} s={[0.24, 0.47, 0.004]} c="#1b1b1e" r={0.8} />
          {[0.1, -0.1].map(y => (
            <group key={y} position={[0, y, 0.034]}>
              <Cy p={[0, 0, 0]} rt={0.085} rb={0.085} h={0.01} rot={[Math.PI / 2, 0, 0]} c="#2a2a2e" m={0.4} r={0.35} />
              <Cy p={[0, 0, 0.008]} rt={0.065} rb={0.065} h={0.008} rot={[Math.PI / 2, 0, 0]} c="#0a0a0b" r={0.6} />
              <Sp p={[0, 0, 0.012]} rad={0.02} sc={[1, 1, 0.5]} c="#3a3a3e" m={0.6} r={0.3} />
            </group>
          ))}
          <B p={[0, 0.215, 0.034]} s={[0.12, 0.012, 0.004]} c="#55555a" m={0.8} r={0.3} />
        </group>
      ))}

      {/* risers with step lights */}
      <B p={[0, 0.175, -0.3]} s={[w - 0.9, 0.35, 2.5]} c="#2d2a27" r={0.95} />
      <B p={[0, 0.525, -0.95]} s={[w - 0.9, 0.35, 1.2]} c="#2d2a27" r={0.95} />
      <Led p={[0, 0.34, 0.96]} s={[w - 0.9, 0.02, 0.02]} color={WARM} k={1.6} />
      <Led p={[0, 0.69, -0.34]} s={[w - 0.9, 0.02, 0.02]} color={WARM} k={1.6} />
      {/* side stairs (left) with lit treads */}
      {[0, 1, 2, 3].map(i => (
        <group key={i}>
          <B p={[-w / 2 + 0.25, (0.175 * (i + 1)) / 2, 1.2 - i * 0.55]} s={[0.5, 0.175 * (i + 1), 0.55]} c="#34302c" />
          <Led p={[-w / 2 + 0.25, 0.175 * (i + 1) - 0.005, 1.2 - i * 0.55 + 0.27]} s={[0.46, 0.015, 0.015]} color={WARM} k={1.4} />
        </group>
      ))}

      {/* leather recliners; plain boxes until the leather texture has loaded */}
      <Suspense fallback={<>
        <Many items={seats.base} c="#1d1d21" r={0.42} />
        <Many items={seats.backs} c="#222227" r={0.42} />
        <Many items={seats.arms} c="#0d0d0f" r={0.6} />
      </>}>
        <Recliners seats={seats.points} arms={seats.armPoints} />
      </Suspense>
      <Suspense fallback={null}><Fabrics w={w} /></Suspense>

      {/* posters with sconces on the side walls */}
      {[-1, 1].map(side => [0, 1].map(k => {
        const z = -1.4 + k * 1.7;
        const x = side * (w / 2 - 0.02);
        return (
          <group key={`${side}${k}`} position={[x, 2.2, z]} rotation={[0, -side * Math.PI / 2, 0]}>
            <B p={[0, 0, 0]} s={[0.84, 1.24, 0.04]} c="#0c0b0a" />
            <Pic p={[0, 0, 0.025]} s={[0.76, 1.14]} map={posters[(side > 0 ? 2 : 0) + k]} e="#ffffff" ei={0.25} />
            <Led p={[0, 0.78, 0.05]} s={[0.5, 0.03, 0.03]} color={WARM} k={1.5} />
          </group>
        );
      }))}

      {/* popcorn cart, front right */}
      <group position={[w / 2 - 0.45, 0, 2.15]}>
        <B p={[0, 0.45, 0]} s={[0.55, 0.7, 0.45]} c="#8e1a1a" r={0.5} />
        {[-0.22, 0.22].map(x => <Cy key={x} p={[x, 0.09, 0.24]} rt={0.09} rb={0.09} h={0.04} rot={[0, 0, Math.PI / 2]} c="#222" />)}
        <B p={[0, 0.86, 0]} s={[0.55, 0.1, 0.45]} c="#5d1010" />
        {/* glass case with warm light and popcorn inside */}
        <mesh position={[0, 1.18, 0]}>
          <boxGeometry args={[0.5, 0.55, 0.4]} />
          <meshStandardMaterial color="#fff2d0" emissive="#ffb347" emissiveIntensity={0.18} transparent opacity={0.22} roughness={0.05} depthWrite={false} />
        </mesh>
        <Many items={popcorn} c="#fff0c8" r={0.9} geo={<icosahedronGeometry args={[1, 1]} />} />
        <Cy p={[0, 1.36, 0]} rt={0.07} rb={0.05} h={0.08} c="#c9ccd2" m={0.9} r={0.25} />
        <pointLight position={[0, 1.38, 0]} color="#ffcf7a" intensity={1.6} distance={1.6} decay={2} />
        {[-1, 1].map(x => [-1, 1].map(z => <B key={`${x}${z}`} p={[x * 0.25, 1.18, z * 0.2]} s={[0.025, 0.55, 0.025]} c="#9a1c1c" r={0.4} />))}
        <B p={[0, 1.5, 0]} s={[0.6, 0.1, 0.48]} c="#9a1c1c" r={0.4} />
        <Cy p={[0, 1.62, 0]} rt={0.12} rb={0.26} h={0.16} c="#a51f1f" r={0.4} />
      </group>

      {/* downlights */}
      {[-1.2, 0, 1.2].map(x => [-0.4, 1.0].map(z => <Down key={`${x}${z}`} x={x * (w / 5.1)} z={z} k={2} />))}

      <pointLight position={[0, H - 0.6, 0.8]} color="#ffd9a8" intensity={16} distance={9} decay={1.5} />
      <pointLight position={[0, 2.3, -D / 2 + 1.2]} color="#f4efe6" intensity={5} distance={6} decay={1.8} />
    </group>
  );
}
