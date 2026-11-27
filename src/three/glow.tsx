/**
 * Fake light spill for LED strips and backlights: additive gradient planes laid on the surfaces next to
 * a light. Far cheaper than real area lights and close enough at the overview's distance.
 */
import { useMemo } from 'react';
import * as THREE from 'three';
import type { V3 } from './parts';

let linear: THREE.CanvasTexture | null = null;
/** Bright at u = 0, gone at u = 1, falling off fast like light from a strip. */
function linearTex() {
  if (linear) return linear;
  const c = document.createElement('canvas');
  c.width = 128; c.height = 4;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 128, 0);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.06, 'rgba(255,255,255,.45)');
  grad.addColorStop(0.3, 'rgba(255,255,255,.08)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 4);
  linear = new THREE.CanvasTexture(c);
  return linear;
}

let radial: THREE.CanvasTexture | null = null;
/** A soft rounded-rectangle halo: bright inside, fading out at the edges. */
function radialTex() {
  if (radial) return radial;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 10, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,.9)');
  grad.addColorStop(0.55, 'rgba(255,255,255,.45)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad; g.fillRect(0, 0, 128, 128);
  radial = new THREE.CanvasTexture(c);
  return radial;
}

/** Light from a strip falling on a surface. `dir` is the direction it fades towards. */
export function Spill({ p, size, rot, dir, color, strength = 0.24 }: {
  p: V3; size: [number, number]; rot?: V3; dir: 'left' | 'right' | 'up' | 'down'; color: string; strength?: number;
}) {
  const map = useMemo(() => {
    const t = linearTex().clone();
    t.center.set(0.5, 0.5);
    t.rotation = dir === 'left' ? Math.PI : dir === 'right' ? 0 : dir === 'up' ? Math.PI / 2 : -Math.PI / 2;
    t.needsUpdate = true;
    return t;
  }, [dir]);
  return (
    <mesh position={p} rotation={rot}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={map} color={color} transparent opacity={strength} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}

/** A soft glow around a backlit thing (a TV's bias light, a neon sign), centred on `p`. */
export function Halo({ p, size, rot, color, strength = 0.5 }: { p: V3; size: [number, number]; rot?: V3; color: string; strength?: number }) {
  return (
    <mesh position={p} rotation={rot}>
      <planeGeometry args={size} />
      <meshBasicMaterial map={radialTex()} color={color} transparent opacity={strength} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  );
}
