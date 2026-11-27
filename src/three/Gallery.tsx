/**
 * The 3D overview: five separate cut-away rooms in a row, the camera looking straight in.
 * One room fills the centre, its neighbours show at the sides, dimmed.
 * Lazy chunk; renders on demand only while something moves.
 * The DOM wrapper (components/Overview.tsx) owns the input and writes into `nav`.
 */
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Environment, Lightformer } from '@react-three/drei';
import { Bloom, EffectComposer, N8AO, ToneMapping, Vignette } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import { useEffect, useMemo, useRef, type ReactNode } from 'react';
import * as THREE from 'three';
import { ROOMS, type RoomId } from '../rooms';
import { Cinema } from './rooms/Cinema';
import { Games } from './rooms/Games';
import { Living } from './rooms/Living';
import { Reading } from './rooms/Reading';
import { Trophies } from './rooms/Trophies';
import { CENTER, D, DEPTH, H, WIDTH, xAt } from './scene';

export interface Nav {
  /** Current (fractional) room position, 0 = cinema. */
  pos: number;
  /** Room the camera glides to. */
  target: number;
  /** A finger or mouse is moving the row: the camera follows `pos` directly. */
  dragging: boolean;
  /** Room being entered (camera moves into it), or null. */
  entering: number | null;
  reduced: boolean;
  /** Ask for a redraw (set by the scene). */
  invalidate?: () => void;
}

const FOV = 34;

const widthAt = (pos: number) => {
  const i = Math.max(0, Math.min(ROOMS.length - 1, pos));
  const a = Math.floor(i), b = Math.min(ROOMS.length - 1, a + 1);
  return WIDTH[ROOMS[a].id] + (WIDTH[ROOMS[b].id] - WIDTH[ROOMS[a].id]) * (i - a);
};

/** Distance at which a room (w × H opening) fills the view, with a little air. */
export function fitDistance(w: number, aspect: number) {
  const t = Math.tan(THREE.MathUtils.degToRad(FOV / 2));
  return Math.max((H * 1.14) / 2 / t, (w * 1.1) / 2 / (t * aspect));
}

function Rig({ nav, onActive }: { nav: Nav; onActive: (i: number) => void }) {
  const { camera, size, invalidate } = useThree();
  const enter = useRef(0);
  const last = useRef(-1);
  const look = useMemo(() => new THREE.Vector3(), []);

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05);
    if (!nav.dragging) {
      const k = nav.reduced ? 1 : 1 - Math.exp(-step * 5.5);
      nav.pos += (nav.target - nav.pos) * k;
      if (Math.abs(nav.target - nav.pos) < 0.0005) nav.pos = nav.target;
    }
    const goalEnter = nav.entering != null ? 1 : 0;
    enter.current += (goalEnter - enter.current) * (nav.reduced ? 1 : 1 - Math.exp(-step * 4));

    const aspect = size.width / size.height;
    const x = xAt(nav.pos);
    const dist = fitDistance(widthAt(nav.pos), aspect);
    const z = (D / 2) * DEPTH + dist - enter.current * (dist + 0.2);
    camera.position.set(x, H * 0.66, z);
    look.set(x, H * 0.42, 0);
    camera.lookAt(look);

    const r = Math.round(nav.pos);
    if (r !== last.current) { last.current = r; onActive(r); }
    if (nav.pos !== nav.target || Math.abs(goalEnter - enter.current) > 0.001) invalidate();
  });
  return null;
}

const ROOM_VIEW: Record<RoomId, (p: { w: number }) => ReactNode> = {
  cinema: p => <Cinema {...p} />,
  games: p => <Games {...p} />,
  living: p => <Living {...p} />,
  reading: p => <Reading {...p} />,
  trophies: p => <Trophies {...p} />,
};

/** One room, its dimming veil and its click target. */
function Room({ i, nav, onPick }: { i: number; nav: Nav; onPick: (i: number) => void }) {
  const id = ROOMS[i].id;
  const w = WIDTH[id];
  const veil = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(() => {
    const far = Math.min(1, Math.abs(nav.pos - i));
    const others = nav.entering != null && nav.entering !== i ? 1 : 0;
    if (veil.current) veil.current.opacity = Math.max(far * 0.86, others * 0.97);
  });
  return (
    <group position={[CENTER[i], 0, 0]}>
      <group scale={[1, 1, DEPTH]}>{ROOM_VIEW[id]({ w })}</group>
      <mesh position={[0, H / 2, (D / 2) * DEPTH + 0.07]} renderOrder={10}>
        <planeGeometry args={[w + 0.6, H + 0.6]} />
        <meshBasicMaterial ref={veil} color="#050507" transparent opacity={0.6} depthWrite={false} toneMapped={false} />
      </mesh>
      <mesh
        position={[0, H / 2, (D / 2) * DEPTH + 0.08]}
        onClick={e => { e.stopPropagation(); onPick(i); }}
        onPointerOver={() => { document.body.style.cursor = 'pointer'; }}
        onPointerOut={() => { document.body.style.cursor = ''; }}
      >
        <planeGeometry args={[w, H]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  );
}

export default function Gallery({ nav, onReady, onActive, onPick }: {
  nav: Nav;
  onReady: () => void;
  onActive: (i: number) => void;
  onPick: (i: number) => void;
}) {
  useEffect(() => () => { document.body.style.cursor = ''; }, []);
  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 1.75]}
      camera={{ fov: FOV, near: 0.1, far: 80, position: [0, H / 2, 14] }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      onCreated={state => {
        state.scene.background = new THREE.Color('#07070a');
        nav.invalidate = state.invalidate;
        requestAnimationFrame(() => requestAnimationFrame(onReady));
      }}
    >
      <hemisphereLight args={['#6a6478', '#1a1712', 1.1]} />
      <ambientLight intensity={0.35} />
      {/* reflections for gold, leather and screens, built locally (no HDR download) */}
      <Environment resolution={128} frames={1} environmentIntensity={0.35}>
        <Lightformer form="rect" intensity={2.5} color="#ffe3b8" position={[0, 4, 2]} scale={[8, 2, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffffff" position={[-5, 2, 3]} scale={[3, 4, 1]} />
        <Lightformer form="rect" intensity={1.2} color="#ffd29a" position={[5, 2, 3]} scale={[3, 4, 1]} />
      </Environment>
      <Rig nav={nav} onActive={onActive} />
      {ROOMS.map((_, i) => <Room key={i} i={i} nav={nav} onPick={onPick} />)}
      <EffectComposer multisampling={4}>
        {/* soft contact shadows in corners, under seats and furniture (half resolution, fast enough for phones) */}
        <N8AO halfRes quality="performance" aoRadius={0.55} distanceFalloff={0.6} intensity={2.6} color="#000000" />
        <Bloom mipmapBlur luminanceThreshold={0.95} luminanceSmoothing={0.2} intensity={0.85} radius={0.72} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
        <Vignette offset={0.32} darkness={0.5} />
      </EffectComposer>
    </Canvas>
  );
}
