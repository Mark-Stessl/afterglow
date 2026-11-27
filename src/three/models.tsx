/**
 * Real furniture: CC0 photo-scanned models from Poly Haven (polyhaven.com), compressed to small .glb files
 * in public/models (meshopt geometry, 512 px WebP textures). Sizes are real-world metres.
 * Rooms are drawn inside a group squashed in depth (DEPTH); models undo that, so they keep their true shape.
 */
import { useGLTF, useTexture } from '@react-three/drei';
import { useLayoutEffect, useMemo, useRef } from 'react';
import * as THREE from 'three';
import { DEPTH } from './scene';
import type { V3 } from './parts';

export const modelUrl = (path: string) => `${import.meta.env.BASE_URL}models/${path}`;

/** A model at a spot in the room, turned around the vertical axis, at its real size times `s`. */
export function Model({ path, p, rot = 0, s = 1 }: { path: string; p: V3; rot?: number; s?: number }) {
  const { scene } = useGLTF(modelUrl(path));
  const obj = useMemo(() => scene.clone(true), [scene]);
  return (
    <group position={p} scale={[1, 1, 1 / DEPTH]}>
      <primitive object={obj} rotation={[0, rot, 0]} scale={s} />
    </group>
  );
}

/** One instance of a model: position and turn in the parent's space, scale, and a colour the textures get multiplied with. */
export interface Placed { p: V3; rot?: V3; s: number; tint?: string }

/** Many copies of one model in a few draw calls (one instanced mesh per part of the model). */
export function Instanced({ path, items }: { path: string; items: Placed[] }) {
  const { scene } = useGLTF(modelUrl(path));
  const parts = useMemo(() => {
    scene.updateMatrixWorld(true);
    const list: { geo: THREE.BufferGeometry; mat: THREE.Material; local: THREE.Matrix4 }[] = [];
    scene.traverse(o => {
      const m = o as THREE.Mesh;
      if (m.isMesh) list.push({ geo: m.geometry, mat: m.material as THREE.Material, local: m.matrixWorld.clone() });
    });
    return list;
  }, [scene]);
  return <>{parts.map((part, i) => <InstancedPart key={i} {...part} items={items} />)}</>;
}

function InstancedPart({ geo, mat, local, items }: { geo: THREE.BufferGeometry; mat: THREE.Material; local: THREE.Matrix4; items: Placed[] }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    const o = new THREE.Object3D();
    const col = new THREE.Color();
    const m = new THREE.Matrix4();
    items.forEach((it, i) => {
      o.position.set(...it.p);
      o.rotation.set(...(it.rot || [0, 0, 0]));
      o.scale.setScalar(it.s);
      o.updateMatrix();
      m.multiplyMatrices(o.matrix, local);
      mesh.setMatrixAt(i, m);
      mesh.setColorAt(i, col.set(it.tint || '#ffffff'));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items, local]);
  return <instancedMesh ref={ref} args={[geo, mat, items.length]} />;
}

/** A textured surface (floor or wall) with a normal map, repeated `rx` × `ry` times. */
export function Surface({ diff, nor, size, rx, ry, p, rot, r = 0.8, c = '#ffffff' }: {
  diff: string; nor: string; size: [number, number]; rx: number; ry: number; p: V3; rot: V3; r?: number; c?: string;
}) {
  const [map, normalMap] = useTexture([modelUrl(diff), modelUrl(nor)]);
  const [m, n] = useMemo(() => {
    const a = map.clone(), b = normalMap.clone();
    [a, b].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.needsUpdate = true; });
    a.colorSpace = THREE.SRGBColorSpace;
    return [a, b];
  }, [map, normalMap, rx, ry]);
  return (
    <mesh position={p} rotation={rot}>
      <planeGeometry args={size} />
      <meshStandardMaterial map={m} normalMap={n} roughness={r} color={c} />
    </mesh>
  );
}
