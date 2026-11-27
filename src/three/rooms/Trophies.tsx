/**
 * Trophy room after the reference: dark wood walls with a white marble feature wall,
 * lit glass cabinets full of gold cups on both sides, framed shirts and a framed medal,
 * a black pedestal with a big cup, four leather armchairs on a white marble floor.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import { B, Cy, D, H, Led, Many, Pic, Shell, Track, type V3 } from '../parts';
import { jersey, marble, panels } from '../textures';

const GOLD = '#d6a640';
const WARM = '#ffd9a0';

/** Glass cabinet with lit shelves of cups. Faces +z. */
function Cabinet({ w, h, shelves, seed }: { w: number; h: number; shelves: number; seed: number }) {
  const cups = useMemo(() => {
    const cup: { p: V3; s: V3 }[] = [], base: { p: V3; s: V3 }[] = [];
    const gap = (h - 0.3) / shelves;
    for (let s = 0; s < shelves; s++) {
      const n = 3 + ((s + seed) % 2);
      for (let i = 0; i < n; i++) {
        const x = -w / 2 + ((i + 0.5) * w) / n;
        const y = 0.2 + s * gap + 0.02;
        const k = 0.7 + ((i * 7 + s * 3 + seed) % 5) * 0.08;
        base.push({ p: [x, y + 0.04 * k, 0], s: [k, k, k] });
        cup.push({ p: [x, y + 0.2 * k, 0], s: [k, k, k] });
      }
    }
    return { cup, base };
  }, [w, h, shelves, seed]);
  const glass = useMemo(() => new THREE.MeshPhysicalMaterial({ color: '#cfe8e4', roughness: 0.05, transmission: 0.9, transparent: true, opacity: 0.18 }), []);
  const gap = (h - 0.3) / shelves;
  return (
    <group>
      <B p={[0, h / 2, -0.2]} s={[w + 0.1, h, 0.04]} c="#1d140d" e="#ffcf8a" ei={0.08} />
      <B p={[-w / 2 - 0.03, h / 2, 0]} s={[0.05, h, 0.42]} c="#24170e" r={0.5} />
      <B p={[w / 2 + 0.03, h / 2, 0]} s={[0.05, h, 0.42]} c="#24170e" r={0.5} />
      <B p={[0, h, 0]} s={[w + 0.1, 0.06, 0.42]} c="#24170e" r={0.5} />
      <B p={[0, 0.08, 0]} s={[w + 0.1, 0.16, 0.42]} c="#24170e" r={0.5} />
      {Array.from({ length: shelves }, (_, s) => (
        <group key={s}>
          <mesh position={[0, 0.2 + s * gap, 0]} material={glass}><boxGeometry args={[w, 0.02, 0.36]} /></mesh>
          <Led p={[0, 0.2 + (s + 1) * gap - 0.04, 0.17]} s={[w - 0.05, 0.012, 0.012]} color={WARM} k={2.2} />
        </group>
      ))}
      <Many items={cups.base} c="#2a2a2a" r={0.5} geo={<cylinderGeometry args={[0.05, 0.06, 0.08, 16]} />} />
      <Many items={cups.cup} c={GOLD} r={0.25} m={0.95} geo={<cylinderGeometry args={[0.08, 0.025, 0.24, 20]} />} />
      <mesh position={[0, h / 2, 0.21]} material={glass}><boxGeometry args={[w, h - 0.2, 0.01]} /></mesh>
    </group>
  );
}

function Armchair({ p, rot }: { p: V3; rot: number }) {
  return (
    <group position={p} rotation={[0, rot, 0]}>
      <B p={[0, 0.27, 0]} s={[0.75, 0.36, 0.72]} c="#5a3e30" r={0.5} />
      <B p={[0, 0.78, -0.3]} s={[0.75, 0.75, 0.14]} c="#634536" r={0.5} />
      <B p={[-0.38, 0.5, -0.05]} s={[0.12, 0.3, 0.62]} c="#634536" r={0.5} />
      <B p={[0.38, 0.5, -0.05]} s={[0.12, 0.3, 0.62]} c="#634536" r={0.5} />
      {[-0.3, 0.3].map(x => [-0.28, 0.28].map(z => <Cy key={`${x}${z}`} p={[x, 0.05, z]} rt={0.025} rb={0.02} h={0.1} c="#140c08" />))}
    </group>
  );
}

export function Trophies({ w }: { w: number }) {
  const tex = useMemo(() => ({
    wall: panels('#3a2616', 'trophy'), marble: marble('marble-wall', '#cfcac2'), floor: marble('marble-floor', '#f1efeb'),
    shirts: [0, 1, 2, 3, 4, 5].map(i => jersey(i)),
  }), []);
  const back = -D / 2;

  return (
    <group>
      <Shell w={w} floor={{ map: tex.floor, c: '#ffffff', r: 0.25 }} wall={{ map: tex.wall, c: '#a07e62', r: 0.7 }} ceiling="#1f1712" />

      {/* marble feature wall with a framed medal */}
      <mesh position={[0, H / 2, back + 0.02]}>
        <planeGeometry args={[1.6, H]} />
        <meshStandardMaterial map={tex.marble} roughness={0.3} />
      </mesh>
      <group position={[0, 2.75, back + 0.05]}>
        <B p={[0, 0, 0]} s={[0.62, 0.72, 0.04]} c="#141414" />
        <B p={[0, 0, 0.022]} s={[0.52, 0.62, 0.01]} c="#1e3a22" />
        <B p={[-0.06, 0.12, 0.03]} s={[0.05, 0.3, 0.01]} rot={[0, 0, 0.4]} c="#c0263a" />
        <B p={[0.06, 0.12, 0.03]} s={[0.05, 0.3, 0.01]} rot={[0, 0, -0.4]} c="#1d3f9e" />
        <Cy p={[0, -0.08, 0.035]} rt={0.08} rb={0.08} h={0.02} rot={[Math.PI / 2, 0, 0]} c={GOLD} m={0.95} r={0.25} />
      </group>

      {/* cabinets: two on the back wall, one along each side wall */}
      <group position={[-1.45, 0, back + 0.25]}><Cabinet w={1.1} h={2.9} shelves={4} seed={1} /></group>
      <group position={[1.45, 0, back + 0.25]}><Cabinet w={1.1} h={2.9} shelves={4} seed={2} /></group>
      <group position={[-w / 2 + 0.25, 0, 0.35]} rotation={[0, Math.PI / 2, 0]}><Cabinet w={1.6} h={3.0} shelves={5} seed={3} /></group>
      <group position={[w / 2 - 0.25, 0, 0.35]} rotation={[0, -Math.PI / 2, 0]}><Cabinet w={1.6} h={3.0} shelves={5} seed={4} /></group>

      {/* framed shirts high on the walls */}
      {[[-1.45, back + 0.06, 0], [1.45, back + 0.06, 0]].map(([x, z], i) => (
        <group key={i} position={[x, 3.6, z]}>
          <B p={[0, 0, 0]} s={[0.56, 0.62, 0.04]} c="#0f0f10" />
          <Pic p={[0, 0, 0.022]} s={[0.48, 0.54]} map={tex.shirts[i]} e="#ffffff" ei={0.2} />
        </group>
      ))}
      {[-1, 1].map(side => [0, 1].map(k => (
        <group key={`${side}${k}`} position={[side * (w / 2 - 0.02), 3.55, -1.3 + k * 1.3]} rotation={[0, -side * Math.PI / 2, 0]}>
          <B p={[0, 0, 0]} s={[0.5, 0.58, 0.04]} c="#0f0f10" />
          <Pic p={[0, 0, 0.022]} s={[0.42, 0.5]} map={tex.shirts[2 + k + (side > 0 ? 2 : 0)]} e="#ffffff" ei={0.2} />
        </group>
      )))}

      {/* pedestal with a big cup */}
      <group position={[0, 0, back + 1.5]}>
        <B p={[0, 0.55, 0]} s={[0.45, 1.1, 0.45]} c="#121212" r={0.35} />
        <Cy p={[0, 1.16, 0]} rt={0.08} rb={0.12} h={0.12} c="#1a1a1a" />
        <Cy p={[0, 1.3, 0]} rt={0.02} rb={0.04} h={0.18} c={GOLD} m={0.95} r={0.2} />
        <Cy p={[0, 1.52, 0]} rt={0.16} rb={0.05} h={0.28} c={GOLD} m={0.95} r={0.2} seg={28} />
        <pointLight position={[0, 2.6, 0.4]} color="#fff0d0" intensity={4} distance={3} decay={1.8} />
      </group>

      <Armchair p={[-1.2, 0, 0.6]} rot={0.7} />
      <Armchair p={[-1.0, 0, 1.75]} rot={1.1} />
      <Armchair p={[1.2, 0, 0.6]} rot={-0.7} />
      <Armchair p={[1.0, 0, 1.75]} rot={-1.1} />

      <Track x1={-1.6} x2={1.6} z={0.7} heads={4} />
      <Track x1={-1.6} x2={1.6} z={-1.2} heads={4} />
      <pointLight position={[0, H - 0.5, 0.7]} color="#ffe2b8" intensity={9} distance={8} decay={1.5} />
    </group>
  );
}
