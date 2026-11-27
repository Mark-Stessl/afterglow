/**
 * Reading room after the reference: dark wood panelling, a wall of bookshelves at the back
 * and along the right, a beige sofa under the shelves, a tufted wingback armchair,
 * a floor lamp and a table lamp in warm light, a red Persian rug, a side table with tea.
 */
import { useEffect, useMemo } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { store } from '../../data/store';
import type { Item } from '../../data/types';
import { B, Cy, D, Down, H, Many, Shell, Sp, type V3 } from '../parts';
import { BOOK_COLORS, panels, persian, planks, rng } from '../textures';

const WOOD = '#3b2516';
const hue = (s: string) => { let h = 0; for (const c of s) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 360; };

/** A manga cover on a canvas: the title on a coloured card first, the real cover once it loads (when its host allows CORS). */
function coverTexture(item: Item, onUpdate: () => void) {
  const c = document.createElement('canvas');
  c.width = 200; c.height = 288;
  const g = c.getContext('2d')!;
  const h = hue(item.title);
  const grad = g.createLinearGradient(0, 0, 200, 288);
  grad.addColorStop(0, `hsl(${h} 45% 42%)`);
  grad.addColorStop(1, `hsl(${(h + 40) % 360} 40% 16%)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 200, 288);
  g.fillStyle = 'rgba(255,255,255,.92)';
  g.font = 'bold 22px Space Grotesk, system-ui, sans-serif';
  const words = item.title.split(/\s+/);
  let line = '', y = 200;
  const lines: string[] = [];
  words.forEach(w => { if ((line + ' ' + w).trim().length > 14) { lines.push(line.trim()); line = w; } else line += ' ' + w; });
  lines.push(line.trim());
  lines.slice(0, 3).forEach(l => { g.fillText(l, 16, y); y += 26; });
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  if (item.cover) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const r = Math.max(200 / img.width, 288 / img.height);
        g.drawImage(img, (200 - img.width * r) / 2, (288 - img.height * r) / 2, img.width * r, img.height * r);
        g.getImageData(0, 0, 1, 1); // throws when the image tainted the canvas
        tex.needsUpdate = true;
        onUpdate();
      } catch { /* keep the title card */ }
    };
    img.src = item.cover;
  }
  return tex;
}

/** One volume standing face-out on a shelf, leaning back a little. */
function FaceOut({ item, p }: { item: Item; p: V3 }) {
  const invalidate = useThree(s => s.invalidate);
  const tex = useMemo(() => coverTexture(item, invalidate), [item, invalidate]);
  useEffect(() => () => tex.dispose(), [tex]);
  const [w, h] = [0.24, 0.345];
  return (
    <group position={p} rotation={[-0.06, 0, 0]}>
      <mesh position={[0, h / 2, -0.012]}><boxGeometry args={[w, h, 0.022]} /><meshStandardMaterial color="#efe9dc" roughness={0.9} /></mesh>
      <mesh position={[0, h / 2, 0.0005]}><planeGeometry args={[w, h]} /><meshStandardMaterial map={tex} roughness={0.55} emissive="#ffffff" emissiveMap={tex} emissiveIntensity={0.35} /></mesh>
    </group>
  );
}

/** Your own manga (most recently touched first) face-out along two eye-level shelves of the back bookcase. */
function MangaDisplay({ w, back }: { w: number; back: number }) {
  const list = useMemo(() => store.all('manga')
    .filter(m => m.status !== 'dropped')
    .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''))
    .slice(0, 8), []);
  if (!list.length) return null;
  const caseW = w - 0.75, x0 = -0.2;
  const perRow = 4;
  const gap = caseW / (perRow + 1);
  const shelfH = (3.7 - 0.2) / 7;
  return (
    <group>
      {list.map((m, i) => {
        const row = Math.floor(i / perRow);
        const col = i % perRow;
        // row 3 and 2 of seven (counted from the floor); spread evenly between the side walls
        const y = 0.12 + (3 - row) * shelfH + 0.018;
        return <FaceOut key={m.id} item={m} p={[x0 - caseW / 2 + gap * (col + 1), y, back + 0.22 + 0.18]} />;
      })}
    </group>
  );
}

/** A bookcase of `cols` bays and `rows` shelves, filled with books (instanced). */
function Bookcase({ w, h, rows, depth = 0.38, seed }: { w: number; h: number; rows: number; depth?: number; seed: number }) {
  const books = useMemo(() => {
    const r = rng(seed);
    const out: { p: V3; s: V3; c: string; rot?: V3 }[] = [];
    const shelfH = (h - 0.2) / rows;
    for (let row = 0; row < rows; row++) {
      let x = -w / 2 + 0.06;
      const y0 = 0.12 + row * shelfH;
      while (x < w / 2 - 0.08) {
        const bw = 0.035 + r() * 0.035;
        const bh = shelfH * (0.62 + r() * 0.28);
        if (r() < 0.06) { x += 0.08; continue; }
        const lean = r() < 0.05 ? 0.15 : 0;
        out.push({ p: [x + bw / 2, y0 + bh / 2, 0.02], s: [bw, bh, depth * 0.78], c: BOOK_COLORS[Math.floor(r() * BOOK_COLORS.length)], rot: [0, 0, lean] });
        x += bw + 0.003;
      }
    }
    return out;
  }, [w, h, rows, depth, seed]);
  const shelfH = (h - 0.2) / rows;
  return (
    <group>
      <B p={[0, h / 2, -depth / 2 + 0.02]} s={[w, h, 0.04]} c="#22150c" r={0.9} />
      <B p={[-w / 2, h / 2, 0]} s={[0.05, h, depth]} c={WOOD} r={0.7} />
      <B p={[w / 2, h / 2, 0]} s={[0.05, h, depth]} c={WOOD} r={0.7} />
      {Array.from({ length: rows + 1 }, (_, i) => <B key={i} p={[0, 0.1 + i * shelfH, 0]} s={[w, 0.035, depth]} c={WOOD} r={0.7} />)}
      <Many items={books} r={0.85} />
    </group>
  );
}

export function Reading({ w }: { w: number }) {
  const tex = useMemo(() => ({ wall: panels('#4a2e1c'), floor: planks('#5a3a24', '#1a0f08', 'reading'), rug: persian() }), []);
  const back = -D / 2;

  return (
    <group>
      <Shell w={w} floor={{ map: tex.floor, c: '#8a6a50', r: 0.55 }} wall={{ map: tex.wall, c: '#b58a6a', r: 0.75 }} ceiling="#2a1c12" />
      {/* crown moulding */}
      <B p={[0, H - 0.1, back + 0.06]} s={[w, 0.2, 0.12]} c="#2a190e" />

      {/* bookshelves: back wall (two bays) and the right wall */}
      <group position={[-0.2, 0, back + 0.22]}><Bookcase w={w - 0.75} h={3.7} rows={7} seed={1} /></group>
      <group position={[w / 2 - 0.22, 0, -0.9]} rotation={[0, -Math.PI / 2, 0]}><Bookcase w={2.2} h={3.6} rows={7} seed={2} /></group>
      <MangaDisplay w={w} back={back} />

      {/* beige sofa under the shelves */}
      <group position={[-0.3, 0, back + 0.85]}>
        <B p={[0, 0.25, 0]} s={[1.9, 0.36, 0.8]} c="#a08a6e" r={0.95} />
        <B p={[0, 0.62, -0.32]} s={[1.9, 0.5, 0.2]} c="#a8927a" r={0.95} />
        <B p={[-0.93, 0.45, 0]} s={[0.18, 0.4, 0.8]} c="#a8927a" r={0.95} />
        <B p={[0.93, 0.45, 0]} s={[0.18, 0.4, 0.8]} c="#a8927a" r={0.95} />
        {[-0.55, 0.55].map(x => <B key={x} p={[x, 0.55, -0.18]} s={[0.42, 0.32, 0.14]} rot={[-0.25, 0, 0]} c="#8c6a48" r={1} />)}
      </group>

      {/* Persian rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0.55]}>
        <planeGeometry args={[3.2, 2.4]} />
        <meshStandardMaterial map={tex.rug} roughness={1} />
      </mesh>

      {/* tufted wingback armchair (front right) */}
      <group position={[1.2, 0, 1.75]} rotation={[0, -0.75, 0]}>
        <B p={[0, 0.27, 0]} s={[0.85, 0.4, 0.8]} c="#b49a78" r={0.95} />
        <B p={[0, 0.85, -0.34]} s={[0.85, 0.9, 0.16]} c="#ae9882" r={0.95} />
        <B p={[-0.43, 0.75, -0.12]} s={[0.12, 0.6, 0.5]} c="#ae9882" r={0.95} />
        <B p={[0.43, 0.75, -0.12]} s={[0.12, 0.6, 0.5]} c="#ae9882" r={0.95} />
        {[[-0.2, 1.0], [0, 0.85], [0.2, 1.0], [-0.2, 0.7], [0.2, 0.7]].map(([x, y], i) => <Sp key={i} p={[x, y, -0.255]} rad={0.015} c="#6b5a48" />)}
        {[-0.33, 0.33].map(x => [-0.3, 0.3].map(z => <Cy key={`${x}${z}`} p={[x, 0.04, z]} rt={0.025} rb={0.02} h={0.08} c="#2a170b" />))}
      </group>

      {/* floor lamp (right) and table lamp on a side table (left) */}
      <group position={[1.6, 0, 0.1]}>
        <Cy p={[0, 0.02, 0]} rt={0.16} rb={0.18} h={0.04} c="#3a2a12" m={0.6} r={0.4} />
        <Cy p={[0, 0.9, 0]} rt={0.015} rb={0.015} h={1.8} c="#6a4a1a" m={0.7} r={0.35} />
        <Cy p={[0, 1.88, 0]} rt={0.17} rb={0.27} h={0.36} c="#f6dcae" e="#ffc46b" ei={1.6} />
        <pointLight position={[0, 1.7, 0.1]} color="#ffbe6b" intensity={9} distance={5} decay={1.6} />
      </group>
      <group position={[-w / 2 + 0.45, 0, 0.55]}>
        <B p={[0, 0.5, 0]} s={[0.55, 0.05, 0.55]} c="#3b2412" r={0.5} />
        <B p={[0, 0.25, 0]} s={[0.45, 0.5, 0.45]} c="#2f1c0e" r={0.6} />
        <Cy p={[0.05, 0.57, 0.05]} rt={0.05} rb={0.05} h={0.08} c="#f2eee6" r={0.3} />
        <Cy p={[-0.12, 0.56, -0.08]} rt={0.08} rb={0.08} h={0.04} c="#e9e3d8" r={0.3} />
        <Cy p={[0.15, 0.53, -0.15]} rt={0.12} rb={0.12} h={0.01} c="#d8cdb8" r={0.3} />
      </group>
      <group position={[0.85, 0, back + 0.55]}>
        <B p={[0, 0.3, 0]} s={[0.4, 0.6, 0.4]} c="#2f1c0e" />
        <Cy p={[0, 0.75, 0]} rt={0.06} rb={0.09} h={0.3} c="#6a4a1a" m={0.6} r={0.4} />
        <Cy p={[0, 1.0, 0]} rt={0.1} rb={0.16} h={0.2} c="#f6dcae" e="#ffc46b" ei={1.4} />
      </group>

      {[-0.9, 0.7].map(x => <Down key={x} x={x} z={0.2} k={1.6} color="#ffd59a" />)}
      <pointLight position={[0, H - 0.6, 0.5]} color="#ffcf8f" intensity={10} distance={7} decay={1.6} />
    </group>
  );
}
