/**
 * Living room after the reference: warm plaster walls with cove light, black ceiling tracks, lit built-in
 * shelves with ceramics and books, framed art, a tall window at night with a potted tree in front, a
 * hanging black fireplace with a glowing fire, a soft grey bouclé L-sofa with cushions, a low dark
 * coffee table, all on a wool rug over a wood floor.
 * Scanned models and textures are CC0 from Poly Haven; the sofa and fireplace are built here.
 */
import { useTexture } from '@react-three/drei';
import { Suspense, useLayoutEffect, useMemo, type ReactNode } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Halo, Spill } from '../glow';
import { Instanced, Model, modelUrl, Surface } from '../models';
import { B, Cy, D, H, Led, Pic, Shell, Sp, Track, type V3 } from '../parts';
import { DEPTH } from '../scene';
import { art, night, rug } from '../textures';

const WARM = '#ffd7a0';

/** Undo the room's depth squash, so what is inside keeps its true shape. */
const True = ({ p, rot = 0, children }: { p: V3; rot?: number; children: ReactNode }) => (
  <group position={p} scale={[1, 1, 1 / DEPTH]}><group rotation={[0, rot, 0]}>{children}</group></group>
);

function RB({ size, p, r = 0.02, mat, rot }: { size: V3; p: V3; r?: number; mat: THREE.Material; rot?: V3 }) {
  const geo = useMemo(() => new RoundedBoxGeometry(...size, 4, Math.min(r, ...size.map(s => s / 2 - 0.0005))), [size, r]);
  useLayoutEffect(() => () => geo.dispose(), [geo]);
  return <mesh geometry={geo} material={mat} position={p} rotation={rot} />;
}

/* ---------- the sofa ---------- */

/**
 * A low modern L-sectional in grey bouclé (scanned wool texture): a plinth on short black feet, plump seat
 * cushions with rounded edges, loose back cushions leaning back, low arms, and a chaise on the left.
 * Seat faces +z. Real metres.
 */
function Sofa() {
  const [map, normalMap] = useTexture([modelUrl('living/wool_boucle_diff.webp'), modelUrl('living/wool_boucle_nor.webp')]);
  const { fabric, foot } = useMemo(() => {
    const m = map.clone(), n = normalMap.clone();
    [m, n].forEach(t => { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 14); t.needsUpdate = true; });
    m.colorSpace = THREE.SRGBColorSpace;
    return {
      // a fine repeat: at the scan's own scale the loops read as a check pattern
      fabric: new THREE.MeshStandardMaterial({ map: m, normalMap: n, normalScale: new THREE.Vector2(1.6, 1.6), color: '#cdc7bf', roughness: 0.98 }),
      foot: new THREE.MeshStandardMaterial({ color: '#141414', roughness: 0.5, metalness: 0.3 }),
    };
  }, [map, normalMap]);
  const W = 2.3, Dp = 0.95, chaise = 1.55; // main width, seat depth, chaise length from the back
  const seatH = 0.42;
  return (
    <group>
      {/* plinth and feet */}
      <RB size={[W, 0.2, Dp]} p={[0, 0.16, 0]} r={0.03} mat={fabric} />
      <RB size={[0.85, 0.2, chaise]} p={[-W / 2 + 0.425, 0.16, (chaise - Dp) / 2]} r={0.03} mat={fabric} />
      {[[-W / 2 + 0.08, -Dp / 2 + 0.08], [W / 2 - 0.08, -Dp / 2 + 0.08], [W / 2 - 0.08, Dp / 2 - 0.08], [-W / 2 + 0.08, chaise - Dp / 2 - 0.08], [-W / 2 + 0.77, chaise - Dp / 2 - 0.08]].map(([x, z], i) => (
        <RB key={i} size={[0.05, 0.06, 0.05]} p={[x, 0.03, z]} r={0.01} mat={foot} />
      ))}
      {/* seat cushions: two on the main part, a long one on the chaise */}
      {[0.17, 0.87].map(x => <RB key={x} size={[0.69, 0.16, Dp - 0.22]} p={[x - 0.15, seatH - 0.08 + 0.04, 0.1]} r={0.06} mat={fabric} />)}
      <RB size={[0.8, 0.16, chaise - 0.22]} p={[-W / 2 + 0.425, seatH - 0.04, (chaise - Dp) / 2 + 0.1]} r={0.06} mat={fabric} />
      {/* back: a low frame with loose cushions leaning against it */}
      <RB size={[W, 0.36, 0.2]} p={[0, 0.44, -Dp / 2 + 0.1]} r={0.05} mat={fabric} />
      {[-0.75, 0, 0.72].map(x => <RB key={x} size={[0.7, 0.44, 0.2]} p={[x, 0.64, -Dp / 2 + 0.2]} r={0.09} mat={fabric} rot={[-0.22, 0, 0]} />)}
      {/* low arm on the right, a narrow one on the chaise's outer side */}
      <RB size={[0.2, 0.3, Dp]} p={[W / 2 - 0.1, 0.4, 0]} r={0.08} mat={fabric} />
      <RB size={[0.16, 0.26, chaise]} p={[-W / 2 + 0.08, 0.38, (chaise - Dp) / 2]} r={0.07} mat={fabric} />
    </group>
  );
}

/* ---------- the fireplace ---------- */

/** A flame: a soft teardrop gradient on a canvas (white-yellow core, orange, red edge). */
function flameTexture() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d')!;
  const tongue = (cx: number, w: number, top: number, col: string) => {
    g.fillStyle = col;
    g.beginPath(); g.moveTo(cx - w, 128);
    g.bezierCurveTo(cx - w, 80, cx - w * 0.3, top + 30, cx, top);
    g.bezierCurveTo(cx + w * 0.3, top + 30, cx + w, 80, cx + w, 128); g.fill();
  };
  g.filter = 'blur(3px)';
  tongue(32, 30, 8, 'rgba(255,70,10,.55)');
  tongue(32, 22, 26, 'rgba(255,140,30,.85)');
  tongue(32, 13, 50, 'rgba(255,215,120,.95)');
  tongue(32, 6, 78, 'rgba(255,250,225,1)');
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

/** A log: a slightly tapered, bark-dark cylinder with glowing cut ends. */
function Log({ p, rot, len, r }: { p: V3; rot: V3; len: number; r: number }) {
  return (
    <group position={p} rotation={rot}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[r * 0.9, r, len, 14, 1]} />
        <meshStandardMaterial color="#2a1a10" roughness={0.95} emissive="#ff4a10" emissiveIntensity={0.18} />
      </mesh>
      {[-1, 1].map(s => (
        <mesh key={s} position={[s * len / 2, 0, 0]} rotation={[0, s * Math.PI / 2, 0]}>
          <circleGeometry args={[r * (s > 0 ? 0.9 : 1), 14]} />
          <meshBasicMaterial color={new THREE.Color(2.2, 0.7, 0.15)} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}

/**
 * A suspended black bowl fireplace: a turned steel body with a real round opening, a sooty interior lit
 * orange from below, crossed logs on a bed of glowing embers, and layered flames, with a flue to the ceiling.
 */
function Fireplace({ flue }: { flue: number }) {
  const open = { y: -0.04, r: 0.25 };
  const body = useMemo(() => {
    // profile of the bowl turned around the y axis: rounded underside, waist, a cone up into the flue
    const key = [[0, -0.42], [0.24, -0.38], [0.4, -0.22], [0.44, 0], [0.4, 0.18], [0.26, 0.32], [0.1, 0.42], [0.07, 0.5]]
      .map(([x, y]) => new THREE.Vector2(x, y));
    // a smooth, finely divided profile, so the cut-out opening gets a clean round edge
    const pts = new THREE.SplineCurve(key).getPoints(140);
    const g = new THREE.LatheGeometry(pts, 220, 0, Math.PI * 2).toNonIndexed();
    // cut the opening: drop every triangle on the front that falls inside the circle
    const pos = g.attributes.position as THREE.BufferAttribute;
    const keep: number[] = [];
    for (let i = 0; i < pos.count; i += 3) {
      let inside = true;
      for (let k = 0; k < 3; k++) {
        const x = pos.getX(i + k), y = pos.getY(i + k), z = pos.getZ(i + k);
        if (!(z > 0.1 && x * x + (y - open.y) * (y - open.y) < open.r * open.r)) inside = false;
      }
      if (!inside) for (let k = 0; k < 3; k++) keep.push(pos.getX(i + k), pos.getY(i + k), pos.getZ(i + k));
    }
    const out = new THREE.BufferGeometry();
    out.setAttribute('position', new THREE.Float32BufferAttribute(keep, 3));
    out.computeVertexNormals();
    return out;
  }, []);
  const steel = useMemo(() => new THREE.MeshStandardMaterial({ color: '#121212', roughness: 0.55, metalness: 0.6 }), []);
  // the inside: soot black, lit orange towards the fire bed (vertex colours on a back-faced shell)
  const inner = useMemo(() => {
    const g = new THREE.SphereGeometry(0.4, 40, 28);
    const pos = g.attributes.position as THREE.BufferAttribute;
    const col = new Float32Array(pos.count * 3);
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i);
      const heat = Math.max(0, 1 - (y + 0.2) / 0.5);
      col[i * 3] = 0.05 + 0.55 * heat * heat; col[i * 3 + 1] = 0.03 + 0.16 * heat * heat; col[i * 3 + 2] = 0.02 + 0.03 * heat;
    }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  const flame = useMemo(() => flameTexture(), []);
  const embers = useMemo(() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d')!;
    g.fillStyle = '#1a0804'; g.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * 128, y = Math.random() * 128, r = 2 + Math.random() * 6;
      const hot = Math.random();
      g.fillStyle = hot > 0.6 ? '#ffb040' : hot > 0.25 ? '#e2501c' : '#5a1a08';
      g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  }, []);
  const flameMat = (k: number) => <meshBasicMaterial map={flame} color={new THREE.Color(k, k, k)} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} side={THREE.DoubleSide} />;
  const bed = open.y - 0.13;
  return (
    <group>
      <mesh geometry={body} material={steel} />
      <mesh geometry={inner} position={[0, 0, -0.01]}>
        <meshStandardMaterial vertexColors color="#4a4440" side={THREE.BackSide} roughness={1} />
      </mesh>
      <mesh position={[0, 0.5 + flue / 2, 0]} material={steel}><cylinderGeometry args={[0.07, 0.07, flue, 24]} /></mesh>
      {/* a thin rim around the opening */}
      <mesh position={[0, open.y, 0.345]}><torusGeometry args={[open.r, 0.012, 10, 64]} /><meshStandardMaterial color="#0a0a0a" metalness={0.7} roughness={0.35} /></mesh>
      {/* bed of embers, two crossed logs, flames rising between them */}
      <mesh position={[0, bed, 0.1]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.22, 32]} />
        <meshBasicMaterial map={embers} color={new THREE.Color(1.6, 1.2, 1)} toneMapped={false} />
      </mesh>
      <Log p={[-0.02, bed + 0.04, 0.1]} rot={[0, 0.5, 0.08]} len={0.3} r={0.035} />
      <Log p={[0.02, bed + 0.07, 0.12]} rot={[0, -0.6, -0.12]} len={0.28} r={0.032} />
      {[[-0.06, 0.09, 0.15, 1.6], [0.05, 0.11, 0.17, 1.8], [0, 0.13, 0.22, 2.2], [-0.02, 0.1, 0.12, 1.4], [0.07, 0.08, 0.13, 1.5]].map(([x, z, h, k], i) => (
        <mesh key={i} position={[x, bed + 0.05 + h / 2, z]} rotation={[0, (i - 2) * 0.5, 0]}>
          <planeGeometry args={[h * 0.55, h]} />
          {flameMat(k)}
        </mesh>
      ))}
      <pointLight position={[0, bed + 0.12, 0.45]} color="#ff8a3a" intensity={3.8} distance={3.5} decay={1.6} />
    </group>
  );
}

/* ---------- art and window ---------- */

/** A real painting (public domain, via Wikimedia Commons) with a faint sheen of glass over it. */
function Artwork({ file, p, size }: { file: string; p: V3; size: [number, number] }) {
  const map = useTexture(modelUrl(file));
  useMemo(() => { map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4; map.needsUpdate = true; }, [map]);
  return (
    <group position={p}>
      <mesh><planeGeometry args={size} /><meshStandardMaterial map={map} roughness={0.7} /></mesh>
      <mesh position={[0, 0, 0.002]}>
        <planeGeometry args={size} />
        <meshPhysicalMaterial color="#ffffff" transparent opacity={0.06} roughness={0.05} clearcoat={1} depthWrite={false} />
      </mesh>
    </group>
  );
}

/** A slim brass picture light above a frame, with its warm pool of light on the wall and picture. */
function PictureLight({ y, w }: { y: number; w: number }) {
  return (
    <group position={[0, y, 0]}>
      <B p={[0, 0, 0.09]} s={[w, 0.03, 0.04]} c="#b08a4a" m={0.9} r={0.3} />
      <B p={[0, 0.03, 0.04]} s={[0.02, 0.06, 0.08]} c="#b08a4a" m={0.9} r={0.3} />
      <B p={[0, -0.016, 0.09]} s={[w - 0.04, 0.004, 0.02]} glow e={WARM} />
      <Halo p={[0, -0.32, 0.03]} size={[w + 0.5, 0.8]} color={WARM} strength={0.3} />
    </group>
  );
}

/**
 * The tall window: a recessed opening with light plaster reveals, slim black frames and glazing bars, a
 * photographed night skyline behind the glass (Shanghai Bund, Poly Haven CC0 panorama), a faint reflection of
 * the warm room on the glass, a stone sill, and the city's cool light falling on the floor.
 */
function WindowView() {
  const view = useTexture(modelUrl('living/window_night.webp'));
  useMemo(() => { view.colorSpace = THREE.SRGBColorSpace; view.needsUpdate = true; }, [view]);
  const W = 1.1, Hh = 3.9, depth = 0.22;
  const glassSheen = useMemo(() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 256;
    const g = c.getContext('2d')!;
    const grad = g.createLinearGradient(0, 256, 64, 0);
    grad.addColorStop(0, 'rgba(255,210,160,.18)'); grad.addColorStop(0.45, 'rgba(255,210,160,0)'); grad.addColorStop(0.7, 'rgba(255,255,255,.05)'); grad.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = grad; g.fillRect(0, 0, 64, 256);
    return new THREE.CanvasTexture(c);
  }, []);
  return (
    <group>
      {/* the view, set back in the reveal */}
      <mesh position={[0, 0, 0.012]}>
        <planeGeometry args={[W, Hh]} />
        <meshBasicMaterial map={view} color={new THREE.Color(0.42, 0.42, 0.52)} toneMapped={false} />
      </mesh>
      {/* reveals: the wall's thickness around the opening */}
      {[-1, 1].map(x => <B key={x} p={[x * (W / 2 + 0.015), 0, depth / 2]} s={[0.03, Hh, depth]} c="#c7b9a3" r={0.9} />)}
      <B p={[0, Hh / 2 + 0.015, depth / 2]} s={[W + 0.06, 0.03, depth]} c="#c7b9a3" r={0.9} />
      {/* frame, one upright and two transoms */}
      {[-1, 1].map(x => <B key={`f${x}`} p={[x * (W / 2 - 0.02), 0, 0.04]} s={[0.04, Hh, 0.05]} c="#141414" r={0.4} />)}
      <B p={[0, Hh / 2 - 0.02, 0.04]} s={[W, 0.04, 0.05]} c="#141414" r={0.4} />
      <B p={[0, -Hh / 2 + 0.02, 0.04]} s={[W, 0.04, 0.05]} c="#141414" r={0.4} />
      <B p={[0, 0, 0.045]} s={[0.025, Hh, 0.035]} c="#141414" r={0.4} />
      {[0.75, -0.6].map(y => <B key={y} p={[0, y, 0.045]} s={[W, 0.025, 0.035]} c="#141414" r={0.4} />)}
      {/* the glass: a faint warm reflection of the room */}
      <mesh position={[0, 0, 0.07]}>
        <planeGeometry args={[W - 0.06, Hh - 0.06]} />
        <meshBasicMaterial map={glassSheen} transparent blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {/* stone sill and the city light on the floor */}
      <B p={[0, -Hh / 2 - 0.02, depth + 0.04]} s={[W + 0.14, 0.04, 0.2]} c="#d9d2c6" r={0.6} />
      <Halo p={[0, -Hh / 2 + 0.008 - 0.05, 0.75]} size={[1.3, 1.4]} rot={[-Math.PI / 2, 0, 0]} color="#8fa0ff" strength={0.16} />
    </group>
  );
}

/* ---------- shelves ---------- */

/** One lit niche: warm light from a strip under the shelf above, washing down the back of the niche. */
function Niche({ y, children }: { y: number; children?: ReactNode }) {
  return (
    <group position={[0, y, 0]}>
      <B p={[0, 0, 0.06]} s={[0.85, 0.04, 0.4]} c="#4a3a2c" r={0.7} />
      <Led p={[0, 0.555, 0.22]} s={[0.8, 0.012, 0.012]} color={WARM} k={2} />
      <Spill p={[0, 0.3, -0.135]} size={[0.85, 0.56]} dir="down" color={WARM} strength={0.35} />
      {children}
    </group>
  );
}

/* ---------- the room ---------- */

export function Living({ w }: { w: number }) {
  const tex = useMemo(() => ({ night: night(), cat: art(31, true), abs: art(44, false), rug: rug('#8f8577', 'living') }), []);
  const back = -D / 2;
  const plaster = { diff: 'living/painted_plaster_wall_diff.webp', nor: 'living/painted_plaster_wall_nor.webp' };

  return (
    <group>
      <Shell w={w} floor={{ c: '#7d6e5f', r: 0.6 }} wall={{ c: '#a3957f', r: 0.92 }} back={{ c: '#9a8c77', r: 0.92 }} ceiling="#3b352e" />
      <Suspense fallback={null}>
        <Surface diff="games/wood_floor_diff.webp" nor="games/wood_floor_nor.webp" size={[w, D]} rx={w / 1.6} ry={(D * DEPTH) / 1.6} p={[0, 0.002, 0]} rot={[-Math.PI / 2, 0, 0]} r={0.5} c="#b8a48e" />
        <Surface {...plaster} size={[w, H]} rx={w / 1.2} ry={H / 1.2} p={[0, H / 2, back + 0.002]} rot={[0, 0, 0]} r={0.92} c="#b4a48c" />
        <Surface {...plaster} size={[D, H]} rx={(D * DEPTH) / 1.2} ry={H / 1.2} p={[-w / 2 + 0.002, H / 2, 0]} rot={[0, Math.PI / 2, 0]} r={0.92} c="#b4a48c" />
        <Surface {...plaster} size={[D, H]} rx={(D * DEPTH) / 1.2} ry={H / 1.2} p={[w / 2 - 0.002, H / 2, 0]} rot={[0, -Math.PI / 2, 0]} r={0.92} c="#b4a48c" />
        {/* soft wool rug under the sofa and table */}
        <Surface diff="cinema/poly_wool_herringbone_diff.webp" nor="cinema/poly_wool_herringbone_nor.webp" size={[3.1, 2.4]} rx={3.2} ry={2.4 * DEPTH} p={[-0.15, 0.006, 0.8]} rot={[-Math.PI / 2, 0, 0]} r={1} c="#cbbfae" />
      </Suspense>

      {/* cove light around the ceiling, its wash on the walls, two black tracks */}
      <Led p={[0, H - 0.06, back + 0.05]} s={[w, 0.03, 0.03]} color={WARM} k={2.4} />
      <Led p={[-w / 2 + 0.05, H - 0.06, 0]} s={[0.03, 0.03, D]} color={WARM} k={2.4} />
      <Led p={[w / 2 - 0.05, H - 0.06, 0]} s={[0.03, 0.03, D]} color={WARM} k={2.4} />
      <Spill p={[0, H - 0.55, back + 0.006]} size={[w, 1.1]} dir="down" color={WARM} strength={0.22} />
      <Spill p={[-w / 2 + 0.006, H - 0.55, 0]} size={[D, 1.1]} rot={[0, Math.PI / 2, 0]} dir="down" color={WARM} strength={0.22} />
      <Spill p={[w / 2 - 0.006, H - 0.55, 0]} size={[D, 1.1]} rot={[0, -Math.PI / 2, 0]} dir="down" color={WARM} strength={0.22} />
      <Track x1={-1.4} x2={1.4} z={0.9} heads={3} />
      <Track x1={-0.4} x2={1.6} z={-1.0} heads={2} />

      {/* built-in shelves with lit niches (back left): ceramics, a leather book set, a little stack */}
      <group position={[-1.3, 0, back + 0.25]}>
        {/* open cabinet: back panel, sides, top and plinth, so the niches show */}
        <B p={[0, 1.85, -0.22]} s={[0.95, 3.7, 0.06]} c="#2e241c" r={0.85} />
        {[-1, 1].map(x => <B key={x} p={[x * 0.45, 1.85, 0]} s={[0.05, 3.7, 0.5]} c="#3a2e24" r={0.8} />)}
        <B p={[0, 3.68, 0]} s={[0.95, 0.06, 0.5]} c="#3a2e24" r={0.8} />
        <B p={[0, 0.25, 0.02]} s={[0.95, 0.5, 0.46]} c="#3a2e24" r={0.8} />
        <Niche y={0.55} />
        <Niche y={1.15} />
        <Niche y={1.75} />
        <Niche y={2.35} />
        <Niche y={2.95} />
        <Suspense fallback={null}>
          <True p={[0.22, 0.57, 0.06]}><Model path="living/ceramic_vase_01.glb" p={[0, 0, 0]} s={0.9} /></True>
          <True p={[-0.25, 1.77, 0.06]}><Model path="living/ceramic_vase_03.glb" p={[0, 0, 0]} s={0.9} /></True>
          <True p={[0.2, 2.37, 0.06]}><Model path="living/ceramic_vase_01.glb" p={[0, 0, 0]} s={0.7} /></True>
          <True p={[-0.05, 2.97, 0.06]}><Model path="living/ceramic_vase_03.glb" p={[0, 0, 0]} s={0.75} /></True>
          <Instanced path="reading/book_encyclopedia_set_01.glb" items={[
            { p: [-0.38, 1.17, -0.06], s: 0.95, tint: '#e8dccb' },
            { p: [-0.36, 0.57, -0.02], rot: [0, 0, Math.PI / 2], s: 0.5, tint: '#9c8b78' },
            { p: [-0.05, 2.37, -0.06], s: 0.62 },
          ]} />
        </Suspense>
      </group>

      {/* art: large framed piece on the left wall, a smaller one on the back wall */}
      <group position={[-w / 2 + 0.02, 2.2, -0.2]} rotation={[0, Math.PI / 2, 0]}>
        <B p={[0, 0, 0]} s={[0.9, 1.2, 0.04]} c="#141414" />
        <B p={[0, 0, 0.022]} s={[0.84, 1.14, 0.005]} c="#efe9df" r={0.9} />
        <Suspense fallback={<Pic p={[0, 0, 0.026]} s={[0.66, 0.96]} map={tex.cat} />}><Artwork file="living/art_monet.webp" p={[0, 0, 0.026]} size={[0.66, 0.96]} /></Suspense>
        <PictureLight y={0.68} w={0.5} />
      </group>
      <group position={[-0.1, 2.35, back + 0.03]}>
        <B p={[0, 0, 0]} s={[0.82, 0.62, 0.03]} c="#141414" />
        <B p={[0, 0, 0.017]} s={[0.76, 0.56, 0.005]} c="#efe9df" r={0.9} />
        <Suspense fallback={<Pic p={[0, 0, 0.021]} s={[0.56, 0.4]} map={tex.abs} />}><Artwork file="living/art_wave.webp" p={[0, 0, 0.021]} size={[0.56, 0.4]} /></Suspense>
        <PictureLight y={0.37} w={0.42} />
      </group>

      {/* tall window at night (back right) with a frame and mullions, a potted tree in front */}
      <group position={[0.95, 2.0, back + 0.02]}>
        <Suspense fallback={<Pic p={[0, 0, 0.045]} s={[1.08, 3.88]} map={tex.night} glow />}><WindowView /></Suspense>
      </group>
      <Suspense fallback={
        <group position={[1.15, 0, back + 0.75]}>
          <Cy p={[0, 0.25, 0]} rt={0.24} rb={0.2} h={0.5} c="#2a2a2a" r={0.5} />
          <Sp p={[0, 1.2, 0]} rad={0.45} sc={[1, 1.3, 1]} c="#2f5a33" r={1} />
        </group>
      }>
        <True p={[1.6, 0, back + 0.8]} rot={0.6}><Model path="living/potted_plant_01.glb" p={[0, 0, 0]} s={1.45} /></True>
      </Suspense>

      {/* hanging fireplace over a low stone hearth (right) */}
      <group position={[w / 2 - 0.55, 0, 0.35]}>
        <B p={[0, 0.1, 0]} s={[0.95, 0.2, 1.7]} c="#4a4540" r={0.85} />
        <True p={[0, 1.3, 0]} rot={-0.35}><Fireplace flue={H - 1.3 - 0.5} /></True>
        <Halo p={[0, 0.21, 0.2]} size={[1.0, 1.4]} rot={[-Math.PI / 2, 0, 0]} color="#ff9a4a" strength={0.35} />
      </group>

      {/* L-sofa with cushions, the coffee table with a vase and books, a black side table */}
      <Suspense fallback={
        <group position={[-0.55, 0, 0.55]}>
          <B p={[0, 0.24, 0]} s={[2.2, 0.36, 0.95]} c="#7d7a75" r={0.95} />
          <B p={[0, 0.62, -0.38]} s={[2.2, 0.45, 0.22]} c="#85827c" r={0.95} />
          <B p={[-1.0, 0.24, 0.85]} s={[0.95, 0.36, 1.0]} c="#7d7a75" r={0.95} />
        </group>
      }>
        <True p={[-0.5, 0, 0.3]}>
          <Sofa />
          <Model path="reading/throw_pillows_01.glb" p={[0.2, 0.5, -0.22]} s={0.95} />
        </True>
        <True p={[0.45, 0, 1.45]} rot={0.08}>
          <Model path="living/coffee_table_round_01.glb" p={[0, 0, 0]} s={0.7} />
          <Model path="living/ceramic_vase_01.glb" p={[0.15, 0.343, -0.08]} s={0.5} />
          <Instanced path="reading/book_encyclopedia_set_01.glb" items={[{ p: [-0.25, 0.343, 0.05], rot: [0, 0, Math.PI / 2], s: 0.36, tint: '#cfc4b4' }]} />
        </True>
      </Suspense>
      {/* small side table by the chaise: the same steel-legged table, narrower and taller */}
      <Suspense fallback={null}>
        <True p={[-1.75, 0, 1.95]}>
          <group scale={[0.34, 1.12, 0.34]}><Model path="living/coffee_table_round_01.glb" p={[0, 0, 0]} /></group>
          <Model path="living/ceramic_vase_03.glb" p={[0.03, 0.548, 0]} s={0.5} />
        </True>
      </Suspense>

      <pointLight position={[0, H - 0.5, 0.6]} color="#ffdcb0" intensity={7} distance={8} decay={1.5} />
      <pointLight position={[-1.3, 2.4, back + 1.0]} color="#ffd29a" intensity={3} distance={4} decay={1.8} />
    </group>
  );
}
