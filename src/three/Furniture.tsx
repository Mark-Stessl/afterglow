/**
 * Room interiors built from simple shapes (no downloaded models, no logos).
 * Every piece is positioned relative to the room centre: x across, y up, z towards the viewer.
 * Room size comes from ROOM in scene.ts.
 */
import { useMemo } from 'react';
import type * as THREE from 'three';
import type { RoomId } from '../rooms';
import { ROOM } from './scene';

type V3 = [number, number, number];
const { W, D } = ROOM;

function Box({ p, s, c, e, ei = 1, r = 0.8, m = 0 }: { p: V3; s: V3; c: string; e?: string; ei?: number; r?: number; m?: number }) {
  return (
    <mesh position={p}>
      <boxGeometry args={s} />
      <meshStandardMaterial color={c} roughness={r} metalness={m} emissive={e || '#000'} emissiveIntensity={e ? ei : 0} />
    </mesh>
  );
}
function Cyl({ p, rt, rb, h, c, e, ei = 1, seg = 20, m = 0, r = 0.6 }: { p: V3; rt: number; rb: number; h: number; c: string; e?: string; ei?: number; seg?: number; m?: number; r?: number }) {
  return (
    <mesh position={p}>
      <cylinderGeometry args={[rt, rb, h, seg]} />
      <meshStandardMaterial color={c} roughness={r} metalness={m} emissive={e || '#000'} emissiveIntensity={e ? ei : 0} />
    </mesh>
  );
}

/** A glowing screen whose brightness the scene can flicker through `screen` (a material ref list). */
function Screen({ p, s, color, onMat }: { p: V3; s: [number, number]; color: string; onMat: (m: THREE.MeshStandardMaterial | null) => void }) {
  return (
    <mesh position={p}>
      <planeGeometry args={s} />
      <meshStandardMaterial ref={onMat} color="#000" emissive={color} emissiveIntensity={1.4} toneMapped={false} />
    </mesh>
  );
}

const back = -D / 2 + 0.07;

function Cinema({ onScreen }: { onScreen: (m: THREE.MeshStandardMaterial | null) => void }) {
  const seats = useMemo(() => {
    const out: V3[] = [];
    [0.5, 1.15].forEach((z, row) => [-1.35, -0.45, 0.45, 1.35].forEach(x => out.push([x, 0.22 + row * 0.12, z])));
    return out;
  }, []);
  return (
    <group>
      {/* screen with frame and curtains */}
      <Box p={[0, 1.45, back - 0.01]} s={[3.1, 1.5, 0.04]} c="#0a0a0a" />
      <Screen p={[0, 1.45, back + 0.02]} s={[2.9, 1.3]} color="#ffe2a8" onMat={onScreen} />
      <Box p={[-1.75, 1.3, back + 0.12]} s={[0.4, 2.3, 0.12]} c="#6d1622" r={0.95} />
      <Box p={[1.75, 1.3, back + 0.12]} s={[0.4, 2.3, 0.12]} c="#6d1622" r={0.95} />
      <Box p={[0, 2.35, back + 0.12]} s={[3.9, 0.3, 0.14]} c="#5a121c" r={0.95} />
      {/* stepped floor and seats */}
      <Box p={[0, 0.06, 1.15]} s={[W - 0.2, 0.12, 0.7]} c="#17131c" />
      {seats.map((p, i) => (
        <group key={i} position={p}>
          <Box p={[0, 0, 0]} s={[0.62, 0.22, 0.5]} c="#7a1a26" r={0.9} />
          <Box p={[0, 0.3, 0.2]} s={[0.62, 0.5, 0.12]} c="#8a1f2c" r={0.9} />
        </group>
      ))}
    </group>
  );
}

function Games({ onScreen }: { onScreen: (m: THREE.MeshStandardMaterial | null) => void }) {
  return (
    <group>
      {/* TV on a low board */}
      <Box p={[0, 0.3, back + 0.35]} s={[2.8, 0.6, 0.55]} c="#1d1f26" />
      <Box p={[0, 1.35, back + 0.12]} s={[2.1, 1.22, 0.06]} c="#08080a" />
      <Screen p={[0, 1.35, back + 0.16]} s={[2.0, 1.12]} color="#5b8cff" onMat={onScreen} />
      {/* console standing upright (white shells, dark core) */}
      <group position={[-1.05, 0.88, back + 0.38]}>
        <Box p={[-0.07, 0, 0]} s={[0.06, 0.56, 0.38]} c="#eef0f4" r={0.4} />
        <Box p={[0, 0, 0]} s={[0.08, 0.52, 0.34]} c="#111216" />
        <Box p={[0.07, 0, 0]} s={[0.06, 0.56, 0.38]} c="#eef0f4" r={0.4} />
      </group>
      {/* handheld in its dock */}
      <group position={[1.05, 0.68, back + 0.4]}>
        <Box p={[0, 0, 0]} s={[0.42, 0.16, 0.12]} c="#2b2c31" />
        <Box p={[0, 0.16, 0.01]} s={[0.36, 0.2, 0.04]} c="#111" />
        <Box p={[-0.23, 0.16, 0.01]} s={[0.08, 0.22, 0.05]} c="#00b8e6" />
        <Box p={[0.23, 0.16, 0.01]} s={[0.08, 0.22, 0.05]} c="#ff4b4b" />
      </group>
      {/* game cases on a wall shelf */}
      <Box p={[1.45, 2.05, back + 0.12]} s={[1.0, 0.04, 0.22]} c="#2a2433" />
      {['#f4f4f6', '#0a3fa8', '#e60012', '#f4f4f6', '#107c10', '#0a3fa8'].map((c, i) => (
        <Box key={i} p={[1.05 + i * 0.13, 2.2, back + 0.12]} s={[0.07, 0.26, 0.2]} c={c} r={0.5} />
      ))}
      {/* beanbag and controller */}
      <mesh position={[0.6, 0.28, 0.9]} scale={[1, 0.62, 1]}>
        <sphereGeometry args={[0.48, 24, 16]} />
        <meshStandardMaterial color="#2b3b6e" roughness={0.95} />
      </mesh>
      <Box p={[-0.3, 0.04, 0.95]} s={[0.26, 0.06, 0.16]} c="#e8e8ec" r={0.4} />
    </group>
  );
}

function Living({ onScreen }: { onScreen: (m: THREE.MeshStandardMaterial | null) => void }) {
  return (
    <group>
      {/* wall TV and low stand */}
      <Box p={[0, 1.45, back + 0.08]} s={[1.9, 1.1, 0.06]} c="#08080a" />
      <Screen p={[0, 1.45, back + 0.12]} s={[1.8, 1.0]} color="#a77bff" onMat={onScreen} />
      <Box p={[0, 0.2, back + 0.3]} s={[2.2, 0.4, 0.45]} c="#2a2230" />
      {/* rug, coffee table, sofa facing the TV */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0.35]}>
        <planeGeometry args={[2.8, 1.6]} />
        <meshStandardMaterial color="#3a2a52" roughness={1} />
      </mesh>
      <Box p={[0, 0.2, 0.2]} s={[1.1, 0.06, 0.55]} c="#5b4636" r={0.6} />
      <Box p={[0, 0.09, 0.2]} s={[1.0, 0.16, 0.45]} c="#3d2f25" />
      <group position={[0, 0, 1.15]}>
        <Box p={[0, 0.22, 0]} s={[2.3, 0.3, 0.75]} c="#4b4f63" r={0.95} />
        <Box p={[0, 0.55, 0.3]} s={[2.3, 0.5, 0.18]} c="#555a70" r={0.95} />
        <Box p={[-1.1, 0.4, 0]} s={[0.18, 0.5, 0.75]} c="#555a70" r={0.95} />
        <Box p={[1.1, 0.4, 0]} s={[0.18, 0.5, 0.75]} c="#555a70" r={0.95} />
      </group>
      {/* remote with a small red LED */}
      <Box p={[0.3, 0.25, 0.25]} s={[0.06, 0.03, 0.2]} c="#111" />
      <Box p={[0.3, 0.27, 0.16]} s={[0.02, 0.01, 0.02]} c="#000" e="#ff3b30" ei={3} />
      {/* plant */}
      <Cyl p={[-1.7, 0.22, back + 0.4]} rt={0.16} rb={0.12} h={0.44} c="#c9b79c" />
      <mesh position={[-1.7, 0.75, back + 0.4]}><sphereGeometry args={[0.32, 14, 10]} /><meshStandardMaterial color="#2f5a3a" roughness={1} /></mesh>
    </group>
  );
}

function Reading() {
  const spines = useMemo(() => {
    const cols = ['#f6e04b', '#e8505b', '#3d7bd9', '#f4f1ea', '#2fb27a', '#ef8a3c', '#9a6cf0', '#e8505b', '#f4f1ea', '#3d7bd9'];
    const out: { p: V3; c: string; h: number }[] = [];
    [0.55, 1.15, 1.75].forEach((y, row) => {
      for (let i = 0; i < 10; i++) {
        const h = 0.34 + ((i * 7 + row * 3) % 5) * 0.015;
        out.push({ p: [-1.65 + i * 0.105, y + h / 2, back + 0.2], c: cols[(i + row * 3) % cols.length], h });
      }
    });
    return out;
  }, []);
  return (
    <group>
      {/* bookshelf with manga spines */}
      <Box p={[-1.17, 1.1, back + 0.2]} s={[1.25, 2.1, 0.36]} c="#2b2118" />
      {[0.5, 1.1, 1.7].map(y => <Box key={y} p={[-1.17, y, back + 0.24]} s={[1.15, 0.04, 0.3]} c="#3a2d20" />)}
      {spines.map((b, i) => <Box key={i} p={b.p} s={[0.09, b.h, 0.24]} c={b.c} r={0.7} />)}
      {/* armchair */}
      <group position={[0.55, 0, 0.3]} rotation={[0, -0.35, 0]}>
        <Box p={[0, 0.25, 0]} s={[0.95, 0.32, 0.85]} c="#7a4b2c" r={0.9} />
        <Box p={[0, 0.7, -0.35]} s={[0.95, 0.75, 0.18]} c="#86532f" r={0.9} />
        <Box p={[-0.45, 0.5, 0]} s={[0.14, 0.32, 0.85]} c="#86532f" r={0.9} />
        <Box p={[0.45, 0.5, 0]} s={[0.14, 0.32, 0.85]} c="#86532f" r={0.9} />
        {/* open book on the seat */}
        <Box p={[0, 0.43, 0.1]} s={[0.34, 0.03, 0.24]} c="#efe9dc" />
      </group>
      {/* floor lamp with a warm shade */}
      <Cyl p={[1.55, 0.02, -0.4]} rt={0.18} rb={0.2} h={0.04} c="#222" />
      <Cyl p={[1.55, 0.85, -0.4]} rt={0.02} rb={0.02} h={1.66} c="#2a2a2a" m={0.6} />
      <Cyl p={[1.55, 1.75, -0.4]} rt={0.16} rb={0.3} h={0.32} c="#f3dfa6" e="#ffd66b" ei={1.3} seg={24} />
      {/* small stack of volumes on the floor */}
      {[0, 1, 2, 3].map(i => <Box key={i} p={[1.0, 0.04 + i * 0.06, 0.95]} s={[0.2, 0.055, 0.3]} c={['#f6e04b', '#e8505b', '#f4f1ea', '#3d7bd9'][i]} />)}
    </group>
  );
}

function Trophies({ onScreen }: { onScreen: (m: THREE.MeshStandardMaterial | null) => void }) {
  const cups: { p: V3; c: string; s: number }[] = [
    { p: [-0.55, 0.87, back + 0.5], c: '#5eead4', s: 1.15 }, { p: [0, 0.87, back + 0.5], c: '#e9be58', s: 1 }, { p: [0.55, 0.87, back + 0.5], c: '#5eead4', s: 1.15 },
    { p: [-0.55, 1.49, back + 0.5], c: '#c9cedc', s: 0.9 }, { p: [0, 1.49, back + 0.5], c: '#5eead4', s: 1.2 }, { p: [0.55, 1.49, back + 0.5], c: '#d08a5b', s: 0.9 },
  ];
  return (
    <group>
      {/* display case: frame, glass shelves, glass front */}
      {/* hollow case: back panel lit from inside, sides, base and top */}
      <Box p={[0, 1.25, back + 0.13]} s={[1.7, 2.3, 0.04]} c="#0f1418" e="#5eead4" ei={0.12} />
      <Box p={[-0.83, 1.25, back + 0.5]} s={[0.04, 2.3, 0.75]} c="#1a1922" />
      <Box p={[0.83, 1.25, back + 0.5]} s={[0.04, 2.3, 0.75]} c="#1a1922" />
      <Box p={[0, 0.2, back + 0.5]} s={[1.7, 0.4, 0.75]} c="#1a1922" />
      <Box p={[0, 2.37, back + 0.5]} s={[1.7, 0.06, 0.75]} c="#1a1922" />
      <pointLight position={[0, 2.2, back + 0.5]} color="#bffcf0" intensity={1.6} distance={2.4} decay={1.5} />
      {[0.85, 1.47].map(y => (
        <mesh key={y} position={[0, y, back + 0.5]}>
          <boxGeometry args={[1.56, 0.02, 0.66]} />
          <meshPhysicalMaterial color="#cfe" transmission={0.9} roughness={0.05} thickness={0.02} transparent opacity={0.5} />
        </mesh>
      ))}
      {cups.map((c, i) => (
        <group key={i} position={c.p} scale={c.s}>
          <Cyl p={[0, 0.03, 0]} rt={0.07} rb={0.09} h={0.06} c="#222" />
          <Cyl p={[0, 0.12, 0]} rt={0.015} rb={0.015} h={0.12} c={c.c} m={0.9} r={0.25} />
          <Cyl p={[0, 0.26, 0]} rt={0.11} rb={0.05} h={0.18} c={c.c} m={0.9} r={0.2} seg={24} />
        </group>
      ))}
      <mesh position={[0, 1.25, back + 0.875]}>
        <boxGeometry args={[1.66, 2.26, 0.01]} />
        <meshPhysicalMaterial color="#dff" transmission={0.95} roughness={0.02} transparent opacity={0.18} />
      </mesh>
      {/* LED scoreboard on the side wall area */}
      <Box p={[1.45, 1.75, back + 0.06]} s={[0.95, 0.5, 0.06]} c="#0b0c0a" />
      <Screen p={[1.45, 1.75, back + 0.1]} s={[0.85, 0.4]} color="#ff5a36" onMat={onScreen} />
      {/* departures board */}
      <Box p={[-1.45, 1.75, back + 0.06]} s={[0.95, 0.6, 0.06]} c="#16161d" />
      {[0, 1, 2, 3].map(i => <Box key={i} p={[-1.45, 1.94 - i * 0.13, back + 0.1]} s={[0.8, 0.08, 0.01]} c="#222" e="#f5b544" ei={0.5 + (i % 2) * 0.3} />)}
      {/* pedestals with single cups */}
      {[-1.4, 1.4].map(x => (
        <group key={x} position={[x, 0, 0.6]}>
          <Box p={[0, 0.45, 0]} s={[0.4, 0.9, 0.4]} c="#24232d" />
          <Cyl p={[0, 1.0, 0]} rt={0.13} rb={0.06} h={0.2} c="#5eead4" m={0.9} r={0.2} />
        </group>
      ))}
    </group>
  );
}

export function Furniture({ id, onScreen }: { id: RoomId; onScreen: (m: THREE.MeshStandardMaterial | null) => void }) {
  switch (id) {
    case 'cinema': return <Cinema onScreen={onScreen} />;
    case 'games': return <Games onScreen={onScreen} />;
    case 'living': return <Living onScreen={onScreen} />;
    case 'reading': return <Reading />;
    case 'trophies': return <Trophies onScreen={onScreen} />;
  }
}

