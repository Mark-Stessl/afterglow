/**
 * Home cinema after the reference: charcoal room, three stepped frames with warm cove light
 * leading to a bright screen, three rows of black recliners on lit risers, posters with
 * sconces on the side walls, a red popcorn cart at the front right.
 */
import { useMemo } from 'react';
import { B, Cy, D, Down, H, Led, Many, Pic, Shell, type V3 } from '../parts';
import { poster } from '../textures';

const WARM = '#ffcf8a';

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
    return { base, backs, arms };
  }, []);

  const posters = useMemo(() => [0, 1, 2, 3, 4, 5].map(i => poster(20 + i)), []);

  return (
    <group>
      <Shell w={w} floor={{ c: '#2a2724', r: 0.95 }} wall={{ c: '#2b2926', r: 0.95 }} back={{ c: '#1b1a18', r: 0.95 }} ceiling="#1e1d1b" />

      {/* stepped frames leading to the screen */}
      <Ring z={1.55} w={w - 0.5} h={H - 0.32} ow={w} oh={H} depth={0.3} />
      <Ring z={0.2} w={w - 1.05} h={H - 0.72} ow={w} oh={H} depth={0.3} />
      <Ring z={-1.2} w={w - 1.6} h={H - 1.1} ow={w} oh={H} depth={0.3} />

      {/* screen */}
      <B p={[0, 2.25, -D / 2 + 0.04]} s={[2.9, 1.55, 0.04]} c="#0b0b0b" />
      <mesh position={[0, 2.25, -D / 2 + 0.07]}>
        <planeGeometry args={[2.7, 1.38]} />
        <meshBasicMaterial color="#f4efe6" toneMapped={false} />
      </mesh>
      {/* speakers beside the screen */}
      {[-1, 1].map(s => <B key={s} p={[s * 1.75, 2.0, -D / 2 + 0.15]} s={[0.22, 1.2, 0.2]} c="#111" r={0.5} />)}

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

      {/* recliners */}
      <Many items={seats.base} c="#1d1d21" r={0.42} />
      <Many items={seats.backs} c="#222227" r={0.42} />
      <Many items={seats.arms} c="#0d0d0f" r={0.6} />

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
      {/* posters on the front pillars */}
      {[-1, 1].map(side => (
        <group key={side} position={[side * (w / 2 - 0.27), 2.3, 1.72]}>
          <B p={[0, 0, 0]} s={[0.42, 0.64, 0.03]} c="#0c0b0a" />
          <Pic p={[0, 0, 0.02]} s={[0.36, 0.56]} map={posters[side > 0 ? 5 : 4]} e="#ffffff" ei={0.25} />
        </group>
      ))}

      {/* popcorn cart, front right */}
      <group position={[w / 2 - 0.45, 0, 2.15]}>
        <B p={[0, 0.45, 0]} s={[0.55, 0.7, 0.45]} c="#8e1a1a" r={0.5} />
        {[-0.22, 0.22].map(x => <Cy key={x} p={[x, 0.09, 0.24]} rt={0.09} rb={0.09} h={0.04} rot={[0, 0, Math.PI / 2]} c="#222" />)}
        <B p={[0, 0.86, 0]} s={[0.55, 0.1, 0.45]} c="#5d1010" />
        <mesh position={[0, 1.18, 0]}>
          <boxGeometry args={[0.5, 0.55, 0.4]} />
          <meshStandardMaterial color="#ffd66b" emissive="#ffb347" emissiveIntensity={0.55} transparent opacity={0.8} />
        </mesh>
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
