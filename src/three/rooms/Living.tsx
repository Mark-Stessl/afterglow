/**
 * Living room after the reference: warm beige walls with cove light, black ceiling tracks,
 * lit built-in shelves, framed art, a tall window at night with a big plant in front,
 * a hanging black fireplace, a grey L-shaped sofa, a dark coffee table on a soft rug.
 */
import { useMemo } from 'react';
import { B, Cy, D, H, Led, Pic, Shell, Sp, Track } from '../parts';
import { art, night, planks, rug } from '../textures';

const WARM = '#ffd7a0';

export function Living({ w }: { w: number }) {
  const floor = useMemo(() => planks('#7d6e5f', '#2e261e', 'living'), []);
  const tex = useMemo(() => ({ night: night(), cat: art(31, true), abs: art(44, false), rug: rug('#8f8577', 'living') }), []);
  const back = -D / 2;

  return (
    <group>
      <Shell w={w} floor={{ map: floor, c: '#a89888', r: 0.6 }} wall={{ c: '#a3957f', r: 0.92 }} back={{ c: '#9a8c77', r: 0.92 }} ceiling="#3b352e" />

      {/* cove light around the ceiling and two black tracks */}
      <Led p={[0, H - 0.06, back + 0.05]} s={[w, 0.03, 0.03]} color={WARM} k={2.4} />
      <Led p={[-w / 2 + 0.05, H - 0.06, 0]} s={[0.03, 0.03, D]} color={WARM} k={2.4} />
      <Led p={[w / 2 - 0.05, H - 0.06, 0]} s={[0.03, 0.03, D]} color={WARM} k={2.4} />
      <Track x1={-1.4} x2={1.4} z={0.9} heads={3} />
      <Track x1={-0.4} x2={1.6} z={-1.0} heads={2} />

      {/* built-in shelves with lit niches (back left) */}
      <group position={[-1.3, 0, back + 0.25]}>
        <B p={[0, 1.85, 0]} s={[0.95, 3.7, 0.5]} c="#3a2e24" r={0.8} />
        {[0.55, 1.15, 1.75, 2.35, 2.95].map((y, i) => (
          <group key={y}>
            <B p={[0, y, 0.06]} s={[0.85, 0.04, 0.4]} c="#5a4636" r={0.7} />
            <Led p={[0, y + 0.5, 0.24]} s={[0.8, 0.015, 0.015]} color={WARM} k={2} />
            <B p={[-0.2 + (i % 3) * 0.15, y + 0.15, 0.06]} s={[0.12, 0.26, 0.2]} c={['#d9cbb4', '#3a3a3a', '#a8785a'][i % 3]} r={0.5} />
            <Cy p={[0.22, y + 0.12, 0.06]} rt={0.07} rb={0.06} h={0.22} c={['#efe6d6', '#272727'][i % 2]} r={0.4} />
          </group>
        ))}
      </group>

      {/* art: large framed piece on the left wall, a smaller one on the back wall */}
      <group position={[-w / 2 + 0.02, 2.2, -0.2]} rotation={[0, Math.PI / 2, 0]}>
        <B p={[0, 0, 0]} s={[0.9, 1.2, 0.04]} c="#141414" />
        <Pic p={[0, 0, 0.025]} s={[0.8, 1.1]} map={tex.cat} />
      </group>
      <group position={[-0.1, 2.35, back + 0.03]}>
        <B p={[0, 0, 0]} s={[0.62, 0.8, 0.03]} c="#141414" />
        <Pic p={[0, 0, 0.02]} s={[0.54, 0.72]} map={tex.abs} />
      </group>

      {/* tall window at night (back right) with a plant */}
      <group position={[0.95, 2.0, back + 0.02]}>
        <B p={[0, 0, 0]} s={[1.15, 4.0, 0.06]} c="#111" r={0.4} />
        <Pic p={[0, 0, 0.035]} s={[1.05, 3.9]} map={tex.night} glow />
        <B p={[0, 0, 0.045]} s={[0.03, 3.9, 0.02]} c="#111" />
      </group>
      <group position={[1.15, 0, back + 0.75]}>
        <Cy p={[0, 0.25, 0]} rt={0.24} rb={0.2} h={0.5} c="#2a2a2a" r={0.5} />
        {[[0, 1.1, 0, 0.45], [0.25, 1.5, 0.05, 0.35], [-0.2, 1.4, 0.1, 0.32], [0.05, 1.8, -0.05, 0.3]].map(([x, y, z, rr], i) => (
          <Sp key={i} p={[x, y, z]} rad={rr} sc={[1, 1.2, 1]} c="#2f5a33" r={1} />
        ))}
      </group>

      {/* hanging fireplace on a low hearth (right) */}
      <group position={[w / 2 - 0.55, 0, 0.35]}>
        <B p={[0, 0.12, 0]} s={[0.9, 0.24, 1.6]} c="#3b3631" r={0.9} />
        <Cy p={[0, 2.9, 0]} rt={0.06} rb={0.06} h={2.4} c="#0d0d0d" m={0.4} r={0.5} />
        <Sp p={[0, 1.25, 0]} rad={0.42} sc={[1, 0.95, 1]} c="#0d0d0d" m={0.3} r={0.45} />
        <Cy p={[0, 1.6, 0]} rt={0.06} rb={0.24} h={0.3} c="#0d0d0d" m={0.3} r={0.45} />
        <mesh position={[0, 1.15, 0.36]}>
          <circleGeometry args={[0.24, 24]} />
          <meshBasicMaterial color={[3.2, 1.3, 0.35]} toneMapped={false} />
        </mesh>
        <pointLight position={[0, 1.1, 0.8]} color="#ff9a4a" intensity={4} distance={3.5} decay={1.6} />
      </group>

      {/* rug, L-shaped sofa, coffee table, side table */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-0.1, 0.006, 0.85]}>
        <planeGeometry args={[3.0, 2.2]} />
        <meshStandardMaterial map={tex.rug} roughness={1} />
      </mesh>
      <group position={[-0.55, 0, 0.55]}>
        <B p={[0, 0.24, 0]} s={[2.2, 0.36, 0.95]} c="#7d7a75" r={0.95} />
        <B p={[0, 0.62, -0.38]} s={[2.2, 0.45, 0.22]} c="#85827c" r={0.95} />
        <B p={[-1.0, 0.24, 0.85]} s={[0.95, 0.36, 1.0]} c="#7d7a75" r={0.95} />
        <B p={[-1.37, 0.62, 0.6]} s={[0.22, 0.45, 1.5]} c="#85827c" r={0.95} />
        {[-0.6, 0, 0.6].map(x => <B key={x} p={[x, 0.52, -0.2]} s={[0.5, 0.3, 0.16]} rot={[-0.25, 0, 0]} c={x === 0 ? '#c9b89c' : '#9b968e'} r={1} />)}
      </group>
      <B p={[0.25, 0.22, 1.25]} s={[1.0, 0.08, 0.6]} c="#1a1816" r={0.35} />
      <B p={[0.25, 0.1, 1.25]} s={[0.9, 0.18, 0.5]} c="#24211e" r={0.5} />
      <Sp p={[0.1, 0.33, 1.25]} rad={0.08} c="#d8d2c6" r={0.4} />
      <group position={[-1.6, 0, 1.75]}>
        <Cy p={[0, 0.3, 0]} rt={0.18} rb={0.18} h={0.04} c="#1b1b1b" />
        <Cy p={[0, 0.15, 0]} rt={0.03} rb={0.1} h={0.3} c="#1b1b1b" />
      </group>

      <pointLight position={[0, H - 0.5, 0.6]} color="#ffdcb0" intensity={9} distance={8} decay={1.5} />
      <pointLight position={[-1.3, 2.4, back + 1.0]} color="#ffd29a" intensity={4} distance={4} decay={1.8} />
    </group>
  );
}
