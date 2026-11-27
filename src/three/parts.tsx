/**
 * Building blocks for the rooms. Coordinates are relative to the room centre at floor level:
 * x across, y up, z towards the viewer (the open front is at z = +D/2).
 */
import { useLayoutEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { D, H } from './scene';

export type V3 = [number, number, number];

interface Mat { c?: string; r?: number; m?: number; map?: THREE.Texture | null; e?: string; ei?: number; glow?: boolean; side?: THREE.Side }

function Material({ c = '#888', r = 0.8, m = 0, map, e, ei = 1, glow, side }: Mat) {
  if (glow) return <meshBasicMaterial color={e || c} toneMapped={false} side={side} />;
  return <meshStandardMaterial color={c} roughness={r} metalness={m} map={map || null} emissive={e || '#000'} emissiveIntensity={e ? ei : 0} side={side} />;
}

export function B({ p, s, rot, ...mat }: { p: V3; s: V3; rot?: V3 } & Mat) {
  return <mesh position={p} rotation={rot}><boxGeometry args={s} /><Material {...mat} /></mesh>;
}
export function Cy({ p, rt, rb, h, seg = 24, rot, ...mat }: { p: V3; rt: number; rb: number; h: number; seg?: number; rot?: V3 } & Mat) {
  return <mesh position={p} rotation={rot}><cylinderGeometry args={[rt, rb, h, seg]} /><Material {...mat} /></mesh>;
}
export function Sp({ p, rad, sc, ...mat }: { p: V3; rad: number; sc?: V3 } & Mat) {
  return <mesh position={p} scale={sc}><sphereGeometry args={[rad, 24, 16]} /><Material {...mat} /></mesh>;
}
/** Flat picture (poster, screen, art) facing +z unless rotated. */
export function Pic({ p, s, map, rot, glow, e, ei }: { p: V3; s: [number, number]; map: THREE.Texture; rot?: V3; glow?: boolean; e?: string; ei?: number }) {
  return (
    <mesh position={p} rotation={rot}>
      <planeGeometry args={s} />
      {glow ? <meshBasicMaterial map={map} toneMapped={false} /> : <meshStandardMaterial map={map} roughness={0.6} emissive={e || '#000'} emissiveMap={e ? map : null} emissiveIntensity={ei ?? 0} />}
    </mesh>
  );
}

/** A thin glowing LED strip (picked up by the bloom). */
export function Led({ p, s, color, k = 2.2 }: { p: V3; s: V3; color: string; k?: number }) {
  const c = useMemo(() => new THREE.Color(color).multiplyScalar(k), [color, k]);
  return <mesh position={p}><boxGeometry args={s} /><meshBasicMaterial color={c} toneMapped={false} /></mesh>;
}

/** Recessed ceiling downlight. */
export function Down({ x, z, k = 2.5, color = '#fff1d6' }: { x: number; z: number; k?: number; color?: string }) {
  return (
    <group position={[x, H - 0.005, z]}>
      <mesh rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.07, 20]} /><meshBasicMaterial color={new THREE.Color(color).multiplyScalar(k)} toneMapped={false} /></mesh>
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0.002, 0]}><ringGeometry args={[0.07, 0.1, 24]} /><meshStandardMaterial color="#222" /></mesh>
    </group>
  );
}

/** Black ceiling track with spot heads pointing down and back. */
export function Track({ x1, x2, z, heads = 4, color = '#fff1d6' }: { x1: number; x2: number; z: number; heads?: number; color?: string }) {
  const len = x2 - x1;
  return (
    <group position={[0, H - 0.04, z]}>
      <B p={[(x1 + x2) / 2, 0, 0]} s={[len, 0.04, 0.05]} c="#0c0c0e" r={0.4} />
      {Array.from({ length: heads }, (_, i) => {
        const x = x1 + (len * (i + 0.5)) / heads;
        return (
          <group key={i} position={[x, -0.1, 0]} rotation={[0.5, 0, 0]}>
            <Cy p={[0, 0, 0]} rt={0.045} rb={0.055} h={0.18} c="#0c0c0e" r={0.4} />
            <mesh position={[0, -0.091, 0]} rotation={[Math.PI / 2, 0, 0]}><circleGeometry args={[0.04, 16]} /><meshBasicMaterial color={new THREE.Color(color).multiplyScalar(2.4)} toneMapped={false} /></mesh>
          </group>
        );
      })}
    </group>
  );
}

/** Instanced boxes, for things that repeat a lot (books, seats, trophies). */
export function Many({ items, c, r = 0.8, m = 0, geo }: { items: { p: V3; s: V3; c?: string; rot?: V3 }[]; c?: string; r?: number; m?: number; geo?: ReactNode }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    items.forEach((it, i) => {
      o.position.set(...it.p);
      o.rotation.set(...(it.rot || [0, 0, 0]));
      o.scale.set(...it.s);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      if (it.c) mesh.setColorAt(i, col.set(it.c));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [items]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, items.length]}>
      {geo || <boxGeometry args={[1, 1, 1]} />}
      <meshStandardMaterial color={items[0]?.c ? '#fff' : c} roughness={r} metalness={m} />
    </instancedMesh>
  );
}

/**
 * The room box: floor, ceiling, back and side walls, a dark frame around the open front.
 * `w` is the room width; walls can take a colour or a texture.
 */
export function Shell({ w, floor, wall, back, ceiling = '#1a1a1d', left, right, frame = '#050507' }: {
  w: number;
  floor: Mat;
  wall: Mat;
  back?: Mat;
  ceiling?: string;
  left?: Mat;
  right?: Mat;
  frame?: string;
}) {
  const t = 0.12;
  return (
    <group>
      <mesh position={[0, -t / 2, 0]}><boxGeometry args={[w, t, D]} /><Material {...floor} /></mesh>
      <mesh position={[0, H + t / 2, 0]}><boxGeometry args={[w, t, D]} /><Material c={ceiling} r={0.9} /></mesh>
      <mesh position={[0, H / 2, -D / 2 - t / 2]}><boxGeometry args={[w, H, t]} /><Material {...(back || wall)} /></mesh>
      <mesh position={[-w / 2 - t / 2, H / 2, 0]}><boxGeometry args={[t, H, D]} /><Material {...(left || wall)} /></mesh>
      <mesh position={[w / 2 + t / 2, H / 2, 0]}><boxGeometry args={[t, H, D]} /><Material {...(right || wall)} /></mesh>
      {/* outside skin: the rooms are separate boxes in the dark */}
      <mesh position={[-w / 2 - t - 0.02, H / 2, 0]}><boxGeometry args={[0.04, H + 0.4, D + 0.1]} /><meshBasicMaterial color="#060608" /></mesh>
      <mesh position={[w / 2 + t + 0.02, H / 2, 0]}><boxGeometry args={[0.04, H + 0.4, D + 0.1]} /><meshBasicMaterial color="#060608" /></mesh>
      {/* the cut edge: a black frame around the opening */}
      <B p={[0, H + 0.1, D / 2]} s={[w + 0.44, 0.2 + t, 0.1]} c={frame} r={1} />
      <B p={[0, -0.1, D / 2]} s={[w + 0.44, 0.2 + t, 0.1]} c={frame} r={1} />
      <B p={[-w / 2 - 0.11, H / 2, D / 2]} s={[0.22, H + 0.4, 0.1]} c={frame} r={1} />
      <B p={[w / 2 + 0.11, H / 2, D / 2]} s={[0.22, H + 0.4, 0.1]} c={frame} r={1} />
    </group>
  );
}

export { D, H };
