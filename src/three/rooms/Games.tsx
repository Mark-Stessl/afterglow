/**
 * Game room after the reference: lavender walls washed in blue and pink, blue LED cove light,
 * a wall TV over a white console with an upright white console beside it, neon signs,
 * floating shelves with collectibles, a desk with two monitors and a gaming chair,
 * navy beanbags and an ottoman on a light wood floor.
 */
import { useMemo } from 'react';
import { B, Cy, D, H, Led, Pic, Shell, Sp, Track } from '../parts';
import { consoleUI, monitorUI, planks } from '../textures';

const BLUE = '#3f7bff';
const PINK = '#ff4fd8';

/** Neon tube: a torus arc. */
function Neon({ p, r, arc = Math.PI * 2, rot = [0, 0, 0] as [number, number, number], color = PINK }: { p: [number, number, number]; r: number; arc?: number; rot?: [number, number, number]; color?: string }) {
  return (
    <mesh position={p} rotation={rot}>
      <torusGeometry args={[r, 0.018, 8, 40, arc]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  );
}

export function Games({ w }: { w: number }) {
  const floor = useMemo(() => planks('#8a7a68', '#3a2f25', 'games'), []);
  const ui = useMemo(() => consoleUI(), []);
  const mon = useMemo(() => [monitorUI(3), monitorUI(8)], []);
  const back = -D / 2;

  return (
    <group>
      <Shell w={w} floor={{ map: floor, c: '#b9aa9a', r: 0.55 }} wall={{ c: '#55537a', r: 0.9 }} back={{ c: '#4f4d78', r: 0.9 }} ceiling="#2c2a52" />

      {/* blue LED cove along the ceiling edges */}
      <Led p={[0, H - 0.05, back + 0.06]} s={[w, 0.05, 0.05]} color={BLUE} k={3} />
      <Led p={[-w / 2 + 0.05, H - 0.05, 0]} s={[0.05, 0.05, D]} color={BLUE} k={3} />
      <Led p={[w / 2 - 0.05, H - 0.05, 0]} s={[0.05, 0.05, D]} color={PINK} k={2.2} />
      <Track x1={-1.2} x2={1.2} z={0.6} heads={3} color="#d9c8ff" />
      <Track x1={-0.8} x2={1.6} z={-1.2} heads={3} color="#d9c8ff" />

      {/* wall TV on the left side of the back wall, with a blue halo */}
      <group position={[-0.75, 2.1, back + 0.06]} scale={1.3}>
        <Led p={[0, 0, -0.01]} s={[2.05, 1.2, 0.01]} color={BLUE} k={1.4} />
        <B p={[0, 0, 0.03]} s={[1.9, 1.08, 0.05]} c="#060608" r={0.3} />
        <Pic p={[0, 0, 0.06]} s={[1.84, 1.03]} map={ui} glow />
      </group>
      {/* white TV console with LED underneath, upright console and a controller */}
      <group position={[-0.85, 0, back + 0.35]}>
        <B p={[0, 0.42, 0]} s={[2.3, 0.42, 0.5]} c="#e9e9ee" r={0.35} />
        <B p={[0, 0.42, 0.252]} s={[0.02, 0.38, 0.005]} c="#c8c8cf" />
        <Led p={[0, 0.2, 0.2]} s={[2.2, 0.02, 0.02]} color={BLUE} k={3} />
        <B p={[0, 0.1, 0]} s={[2.1, 0.2, 0.42]} c="#d0d0d6" r={0.4} />
        <group position={[-0.85, 0.95, 0]}>
          <B p={[-0.07, 0, 0]} s={[0.05, 0.62, 0.38]} c="#f4f5f8" r={0.3} />
          <B p={[0, 0, 0]} s={[0.1, 0.58, 0.34]} c="#101114" />
          <B p={[0.07, 0, 0]} s={[0.05, 0.62, 0.38]} c="#f4f5f8" r={0.3} />
          <Led p={[0, 0.27, 0.172]} s={[0.08, 0.01, 0.005]} color={BLUE} k={3} />
        </group>
        <B p={[0.6, 0.67, 0.05]} s={[0.24, 0.06, 0.14]} c="#f0f0f4" r={0.4} />
        <B p={[0.95, 0.75, 0]} s={[0.12, 0.24, 0.12]} c="#1a1a22" />
      </group>

      {/* neon controller and neon lettering on the back wall */}
      <group position={[0.75, 2.85, back + 0.05]}>
        <Neon p={[-0.13, 0, 0]} r={0.12} arc={Math.PI * 1.4} rot={[0, 0, Math.PI * 0.8]} />
        <Neon p={[0.13, 0, 0]} r={0.12} arc={Math.PI * 1.4} rot={[0, 0, -Math.PI * 0.2]} />
        <B p={[0, 0.1, 0]} s={[0.26, 0.036, 0.036]} glow e={PINK} />
        <Neon p={[-0.12, -0.02, 0]} r={0.03} color="#7ee8ff" />
        <Neon p={[0.12, -0.02, 0]} r={0.03} color="#7ee8ff" />
      </group>
      <group position={[1.55, 2.75, back + 0.05]}>
        {[0, 1, 2, 3].map(i => <Neon key={i} p={[-0.3 + i * 0.2, 0.07, 0]} r={0.07} arc={Math.PI * (1 + (i % 2) * 0.6)} rot={[0, 0, i]} />)}
        {[0, 1, 2, 3, 4].map(i => <Neon key={`b${i}`} p={[-0.3 + i * 0.15, -0.12, 0]} r={0.05} arc={Math.PI * 1.5} rot={[0, 0, i * 1.3]} color="#ff7ad9" />)}
      </group>

      {/* floating shelves with blue light and collectibles */}
      {[2.95, 2.35].map((y, k) => (
        <group key={y} position={[k === 0 ? 0.55 : 1.15, y, back + 0.13]}>
          <B p={[0, 0, 0]} s={[1.1, 0.05, 0.25]} c="#e8e8ee" r={0.4} />
          <Led p={[0, -0.03, 0.1]} s={[1.05, 0.015, 0.015]} color={BLUE} k={3} />
          {[-0.4, -0.15, 0.1, 0.35].map((x, i) => (
            <B key={x} p={[x, 0.12 + (i % 2) * 0.03, 0]} s={[0.12, 0.2 + (i % 2) * 0.06, 0.12]} c={['#ff5a5a', '#ffd34d', '#4dd2ff', '#ffffff'][(i + k) % 4]} r={0.5} />
          ))}
        </group>
      ))}

      {/* desk with two monitors and a gaming chair (back right) */}
      <group position={[w / 2 - 1.05, 0, back + 0.55]}>
        <B p={[0, 0.74, 0]} s={[1.6, 0.05, 0.65]} c="#f2f2f5" r={0.35} />
        <B p={[-0.6, 0.36, 0]} s={[0.4, 0.72, 0.6]} c="#e9e9ee" r={0.4} />
        {[0.2, 0.42, 0.62].map(y => <B key={y} p={[-0.6, y, 0.302]} s={[0.36, 0.005, 0.005]} c="#b8b8c0" />)}
        <B p={[0.72, 0.36, 0]} s={[0.05, 0.72, 0.6]} c="#e9e9ee" r={0.4} />
        {[-0.33, 0.33].map((x, i) => (
          <group key={x} position={[x, 1.06, -0.12]} rotation={[0, -x * 0.5, 0]}>
            <B p={[0, 0, 0]} s={[0.66, 0.4, 0.03]} c="#050507" />
            <Pic p={[0, 0, 0.016]} s={[0.62, 0.36]} map={mon[i]} glow />
            <B p={[0, -0.25, 0]} s={[0.04, 0.14, 0.04]} c="#222" />
          </group>
        ))}
        <Led p={[0, 0.72, 0.3]} s={[1.55, 0.012, 0.012]} color={PINK} k={2.4} />
        {/* chair */}
        <group position={[0.1, 0, 0.75]} rotation={[0, 0.35, 0]}>
          <Cy p={[0, 0.08, 0]} rt={0.3} rb={0.3} h={0.04} seg={5} c="#111" />
          <Cy p={[0, 0.28, 0]} rt={0.03} rb={0.03} h={0.36} c="#222" m={0.6} />
          <B p={[0, 0.5, 0]} s={[0.52, 0.12, 0.5]} c="#16161c" r={0.6} />
          <B p={[0, 0.98, 0.22]} s={[0.5, 0.86, 0.12]} c="#17171e" r={0.6} />
          <B p={[0, 1.02, 0.285]} s={[0.12, 0.6, 0.01]} c="#3f7bff" />
        </group>
      </group>

      {/* beanbags and ottoman */}
      <Sp p={[1.15, 0.4, 1.0]} rad={0.62} sc={[1, 0.68, 1]} c="#1e2a66" r={0.95} />
      <Sp p={[0.8, 0.32, 1.95]} rad={0.55} sc={[1.1, 0.6, 1]} c="#1b2560" r={0.95} />
      <B p={[-0.35, 0.22, 1.1]} s={[0.75, 0.44, 0.6]} c="#25307a" r={0.95} />
      <B p={[-0.35, 0.47, 1.1]} s={[0.2, 0.03, 0.1]} c="#f0f0f4" r={0.4} />

      <pointLight position={[-0.9, 3.4, 0.5]} color="#8095ff" intensity={13} distance={8} decay={1.5} />
      <pointLight position={[1.4, 3.3, 0.2]} color="#c27dff" intensity={8} distance={6} decay={1.6} />
      <pointLight position={[0, 2.2, 2.2]} color="#9fb0ff" intensity={4} distance={5} decay={1.8} />
    </group>
  );
}
