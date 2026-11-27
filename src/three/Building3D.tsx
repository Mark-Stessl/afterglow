/**
 * The 3D overview: one long building cut open at the front, five rooms left to right.
 * Lazy chunk. Renders on demand only (no frames while nothing moves).
 * Desktop shows the whole building; a phone frames one room and swipes between them.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { ROOMS, type Room } from '../rooms';
import { href } from '../router';
import { Furniture } from './Furniture';
import { COUNT, LIGHT, ROOM, TOTAL_W, WALL, roomX } from './scene';

const { W, D, H } = ROOM;
const FOV = 32;
const FRONT = D / 2;

type View = { x: number; y: number; w: number; h: number };

/** Camera position that fits a box of w × h (on the front plane) into the canvas. */
function fit(v: View, aspect: number, out: THREE.Vector3) {
  const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  const dist = Math.max(v.w / 2 / (t * aspect), v.h / 2 / t);
  return out.set(v.x, v.y + dist * 0.24, FRONT + dist);
}

interface Shared {
  hover: number | null;
  /** Room being entered (camera flies in), or null. */
  entering: number | null;
  focus: number;
  narrow: boolean;
  reduced: boolean;
  pointer: { x: number; y: number };
}

function Rig({ s }: { s: React.RefObject<Shared> }) {
  const { camera, size, invalidate } = useThree();
  const goal = useMemo(() => new THREE.Vector3(), []);
  const look = useMemo(() => new THREE.Vector3(), []);
  const cur = useRef<THREE.Vector3 | null>(null);
  const first = useRef(true);

  useFrame((_, dt) => {
    const st = s.current!;
    const aspect = size.width / size.height;
    let v: View;
    if (st.entering != null) v = { x: roomX(st.entering), y: 1.25, w: W * 0.62, h: H * 0.5 };
    else if (st.narrow) v = { x: roomX(st.focus), y: H / 2 - 0.15, w: W * 1.08, h: H * 1.15 };
    else v = { x: 0, y: H / 2 - 0.05, w: TOTAL_W * 1.03, h: H * 1.25 };
    fit(v, aspect, goal);
    if (!st.narrow && st.entering == null && !st.reduced) {
      goal.x += st.pointer.x * 0.6;
      goal.y += st.pointer.y * 0.25;
    }
    look.set(v.x, v.y - 0.1, FRONT - D * 0.55);
    if (!cur.current) cur.current = new THREE.Vector3().copy(look);

    if (first.current || st.reduced) {
      camera.position.copy(goal);
      cur.current.copy(look);
      first.current = false;
    } else {
      const k = 1 - Math.exp(-dt * (st.entering != null ? 5 : 7));
      camera.position.lerp(goal, k);
      cur.current.lerp(look, k);
    }
    camera.lookAt(cur.current);
    if (camera.position.distanceToSquared(goal) > 1e-5) invalidate();
  });
  return null;
}

function Shell() {
  const wall = '#26222f';
  const outer = '#121019';
  return (
    <group>
      {/* floors, ceilings and back walls run the full length */}
      <mesh position={[0, -0.08, 0]}><boxGeometry args={[TOTAL_W, 0.16, D]} /><meshStandardMaterial color="#25202c" roughness={0.85} /></mesh>
      <mesh position={[0, H + 0.1, 0]}><boxGeometry args={[TOTAL_W, 0.2, D]} /><meshStandardMaterial color={outer} roughness={1} /></mesh>
      <mesh position={[0, H / 2, -D / 2 - 0.05]}><boxGeometry args={[TOTAL_W, H + 0.4, 0.1]} /><meshStandardMaterial color={wall} roughness={0.95} /></mesh>
      {/* dividers and end walls */}
      {Array.from({ length: COUNT + 1 }, (_, i) => (
        <mesh key={i} position={[-TOTAL_W / 2 + WALL / 2 + i * (W + WALL), H / 2, 0]}>
          <boxGeometry args={[WALL, H + 0.2, D]} />
          <meshStandardMaterial color={i === 0 || i === COUNT ? outer : '#2a2634'} roughness={0.95} />
        </mesh>
      ))}
      {/* roof parapet and front edge (the cut through the building) */}
      <mesh position={[0, H + 0.34, FRONT - 0.1]}><boxGeometry args={[TOTAL_W + 0.1, 0.3, 0.2]} /><meshStandardMaterial color="#17141f" roughness={1} /></mesh>
      <mesh position={[0, -0.3, FRONT - 0.05]}><boxGeometry args={[TOTAL_W + 0.1, 0.36, 0.1]} /><meshStandardMaterial color="#100e15" roughness={1} /></mesh>
      {/* street */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.48, 6]}>
        <planeGeometry args={[TOTAL_W * 3, 16]} />
        <meshStandardMaterial color="#1a1722" roughness={1} />
      </mesh>
    </group>
  );
}

function RoomBox({ room, i, s, onEnter }: { room: Room; i: number; s: React.RefObject<Shared>; onEnter: (i: number) => void }) {
  const light = useRef<THREE.PointLight>(null);
  const fill = useRef<THREE.SpotLight>(null);
  const screens = useRef<THREE.MeshStandardMaterial[]>([]);
  const base = useRef(new Map<THREE.MeshStandardMaterial, number>());
  const level = useRef(1);
  const { invalidate } = useThree();
  const x = roomX(i);
  const color = LIGHT[room.id];
  const aim = useMemo(() => { const o = new THREE.Object3D(); o.position.set(0, 0.6, -D / 2); return o; }, []);

  useFrame((_, dt) => {
    const st = s.current!;
    const active = st.entering ?? st.hover ?? (st.narrow ? st.focus : null);
    const target = active == null ? 1 : active === i ? 1.55 : 0.35;
    const k = st.reduced ? 1 : 1 - Math.exp(-dt * 9);
    level.current += (target - level.current) * k;
    if (light.current) light.current.intensity = 15 * level.current;
    if (fill.current) fill.current.intensity = 14 * level.current;
    for (const m of screens.current) {
      if (!base.current.has(m)) base.current.set(m, m.emissiveIntensity);
      m.emissiveIntensity = base.current.get(m)! * (0.45 + 0.55 * level.current);
    }
    if (Math.abs(target - level.current) > 0.003) invalidate();
  });

  return (
    <group position={[x, 0, 0]}>
      <Furniture id={room.id} onScreen={m => { if (m && !screens.current.includes(m)) screens.current.push(m); }} />
      <pointLight ref={light} position={[0, H - 0.35, 0.2]} color={color} intensity={15} distance={8} decay={1.5} />
      <primitive object={aim} />
      <spotLight ref={fill} position={[0, H - 0.1, FRONT + 0.4]} target={aim} angle={0.9} penumbra={0.8} color={color} intensity={14} distance={9} decay={1.5} />
      {/* invisible hit box: the whole room is the button */}
      <mesh
        position={[0, H / 2, 0]}
        onPointerOver={e => { e.stopPropagation(); s.current!.hover = i; document.body.style.cursor = 'pointer'; invalidate(); }}
        onPointerOut={() => { if (s.current!.hover === i) s.current!.hover = null; document.body.style.cursor = ''; invalidate(); }}
        onClick={e => { e.stopPropagation(); onEnter(i); }}
      >
        <boxGeometry args={[W, H, D]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
      <Html position={[0, -0.62, FRONT]} center zIndexRange={[5, 0]} wrapperClass="pointer-events-none">
        <a
          href={href(room.id)}
          onClick={e => { e.preventDefault(); onEnter(i); }}
          onFocus={() => { s.current!.hover = i; invalidate(); }}
          onBlur={() => { s.current!.hover = null; invalidate(); }}
          onPointerEnter={() => { s.current!.hover = i; invalidate(); }}
          onPointerLeave={() => { s.current!.hover = null; invalidate(); }}
          className="pointer-events-auto block whitespace-nowrap rounded-md px-2 py-1 text-center no-underline outline-offset-2"
        >
          <span className="block font-display text-[15px] font-semibold text-text">{room.name}</span>
          <span className="block text-[12px] text-muted">{room.holds}</span>
        </a>
      </Html>
    </group>
  );
}

export default function Building3D({ onReady, focus, onFocus, narrow }: {
  onReady: () => void;
  focus: number;
  onFocus: (i: number) => void;
  narrow: boolean;
}) {
  const reduced = useMemo(() => matchMedia('(prefers-reduced-motion: reduce)').matches, []);
  const s = useRef<Shared>({ hover: null, entering: null, focus, narrow, reduced, pointer: { x: 0, y: 0 } });
  s.current.focus = focus;
  s.current.narrow = narrow;
  const [inv, setInv] = useState<(() => void) | null>(null);
  useEffect(() => { inv?.(); }, [focus, narrow, inv]);
  // the canvas changes size when it swaps in for the flat building: draw again after that
  useEffect(() => {
    if (!inv) return;
    const ts = [60, 300, 700].map(t => setTimeout(inv, t));
    return () => ts.forEach(clearTimeout);
  }, [inv]);
  useEffect(() => () => { document.body.style.cursor = ''; }, []);

  const swipe = useRef<{ x: number; y: number; moved: boolean } | null>(null);

  const enter = (i: number) => {
    if (swipe.current?.moved) return;
    if (narrow && i !== focus) { onFocus(i); return; }
    const go = () => { location.hash = href(ROOMS[i].id); };
    if (reduced) { go(); return; }
    s.current.entering = i;
    inv?.();
    setTimeout(go, 620);
  };

  return (
    <div
      className="absolute inset-0 touch-pan-y"
      onPointerDown={e => { swipe.current = { x: e.clientX, y: e.clientY, moved: false }; }}
      onPointerMove={e => {
        const r = e.currentTarget.getBoundingClientRect();
        s.current.pointer = { x: ((e.clientX - r.left) / r.width) * 2 - 1, y: -(((e.clientY - r.top) / r.height) * 2 - 1) };
        if (!narrow) inv?.();
        const sw = swipe.current;
        if (sw && Math.abs(e.clientX - sw.x) > 12) sw.moved = true;
      }}
      onPointerUp={e => {
        const sw = swipe.current;
        if (sw && narrow) {
          const dx = e.clientX - sw.x;
          if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(e.clientY - sw.y)) onFocus(Math.max(0, Math.min(COUNT - 1, focus + (dx < 0 ? 1 : -1))));
        }
        // let the click that follows this pointerup see `moved`, then reset
        setTimeout(() => { swipe.current = null; }, 0);
      }}
      onPointerLeave={() => { s.current.pointer = { x: 0, y: 0 }; inv?.(); }}
    >
      <Canvas
        frameloop="demand"
        dpr={[1, 1.5]}
        camera={{ fov: FOV, near: 0.1, far: 120, position: [0, 2, 20] }}
        gl={{ antialias: true, powerPreference: 'default' }}
        onCreated={state => {
          state.scene.background = new THREE.Color('#0A0A0F');
          state.scene.fog = new THREE.Fog('#0A0A0F', 22, 60);
          setInv(() => state.invalidate);
          requestAnimationFrame(() => requestAnimationFrame(onReady));
        }}
      >
        <ambientLight intensity={0.45} color="#8a86a8" />
        <hemisphereLight args={['#4a4566', '#0a0a0f', 0.5]} />
        <Rig s={s} />
        <Shell />
        {ROOMS.map((r, i) => <RoomBox key={r.id} room={r} i={i} s={s} onEnter={enter} />)}
      </Canvas>
    </div>
  );
}
