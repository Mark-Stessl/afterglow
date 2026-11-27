/**
 * Reading room after the reference: dark wood panelling, a wall of bookshelves at the back
 * and along the right, a beige sofa under the shelves, a tufted wingback armchair,
 * a floor lamp and a table lamp in warm light, a red Persian rug, a side table with tea.
 */
import { Suspense, useMemo } from 'react';
import { Instanced, Model, Surface, type Placed } from '../models';
import { DEPTH } from '../scene';
import { B, Cy, D, Down, H, Many, Shell, type V3 } from '../parts';
import { BOOK_COLORS, panels, persian, planks, rng } from '../textures';

const WOOD = '#3b2516';

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
      {/* simple box books until the scanned leather sets have loaded */}
      <Suspense fallback={<Many items={books} r={0.85} />}><BookSets w={w} h={h} rows={rows} depth={depth} seed={seed} /></Suspense>
    </group>
  );
}

/* the scanned encyclopedia set: 0.55 m wide, 0.24 m tall, its origin at the left back of the row */
const SET = { w: 0.551, h: 0.237, x0: 0.019, z0: 0.062 };
const LEATHER = ['#ffffff', '#ffffff', '#d99a8a', '#9fc09a', '#9aa8d0', '#d8c08a', '#b07a6a'];

/** Shelves filled with leather-bound sets in a few colours, now and then a gap. */
function BookSets({ w, h, rows, depth, seed }: { w: number; h: number; rows: number; depth: number; seed: number }) {
  const items = useMemo(() => {
    const r = rng(seed + 10);
    const shelfH = (h - 0.2) / rows;
    const out: Placed[] = [];
    for (let row = 0; row < rows; row++) {
      const y0 = 0.12 + row * shelfH;
      const k = (shelfH * (0.7 + r() * 0.12)) / SET.h;
      let x = -w / 2 + 0.05;
      while (x + SET.w * k < w / 2 - 0.04) {
        if (r() < 0.12) { x += 0.12 + r() * 0.15; continue; }
        out.push({ p: [x + SET.x0 * k, y0, -depth / 2 + 0.04 + SET.z0 * k], s: k, tint: LEATHER[Math.floor(r() * LEATHER.length)] });
        x += SET.w * k + 0.01;
      }
    }
    return out;
  }, [w, h, rows, depth, seed]);
  return <Instanced path="reading/book_encyclopedia_set_01.glb" items={items} />;
}

/** Herringbone parquet (Poly Haven) on the floor, dark wood panelling (Poly Haven) on the walls, laid over the painted shell. */
function Panelling({ w }: { w: number }) {
  const floor = { diff: 'reading/herringbone_parquet_diff.webp', nor: 'reading/herringbone_parquet_nor.webp' };
  const wall = { diff: 'reading/dark_paneled_wood_diff.webp', nor: 'reading/dark_paneled_wood_nor.webp' };
  return (
    <>
      <Surface {...floor} size={[w, D]} rx={w / 1.4} ry={(D * DEPTH) / 1.4} p={[0, 0.002, 0]} rot={[-Math.PI / 2, 0, 0]} r={0.55} c="#c9a88a" />
      <Surface {...wall} size={[w, H]} rx={w / 1.6} ry={H / 1.6} p={[0, H / 2, -D / 2 + 0.002]} rot={[0, 0, 0]} r={0.7} c="#d8b89a" />
      <Surface {...wall} size={[D, H]} rx={(D * DEPTH) / 1.6} ry={H / 1.6} p={[-w / 2 + 0.002, H / 2, 0]} rot={[0, Math.PI / 2, 0]} r={0.7} c="#d8b89a" />
      <Surface {...wall} size={[D, H]} rx={(D * DEPTH) / 1.6} ry={H / 1.6} p={[w / 2 - 0.002, H / 2, 0]} rot={[0, -Math.PI / 2, 0]} r={0.7} c="#d8b89a" />
    </>
  );
}

/** The box furniture the room started with; shown while the real models load. */
function BoxFurniture({ back }: { back: number }) {
  return (
    <>
      <group position={[-0.3, 0, back + 0.85]}>
        <B p={[0, 0.25, 0]} s={[1.9, 0.36, 0.8]} c="#a08a6e" r={0.95} />
        <B p={[0, 0.62, -0.32]} s={[1.9, 0.5, 0.2]} c="#a8927a" r={0.95} />
        <B p={[-0.93, 0.45, 0]} s={[0.18, 0.4, 0.8]} c="#a8927a" r={0.95} />
        <B p={[0.93, 0.45, 0]} s={[0.18, 0.4, 0.8]} c="#a8927a" r={0.95} />
      </group>
      <group position={[1.2, 0, 1.75]} rotation={[0, -0.75, 0]}>
        <B p={[0, 0.27, 0]} s={[0.85, 0.4, 0.8]} c="#b49a78" r={0.95} />
        <B p={[0, 0.85, -0.34]} s={[0.85, 0.9, 0.16]} c="#ae9882" r={0.95} />
      </group>
    </>
  );
}

/** Photo-scanned furniture (Poly Haven, CC0), a little larger than life to suit the tall room. */
function RealFurniture({ w, back }: { w: number; back: number }) {
  const s = 1.2;
  return (
    <>
      {/* classic beige sofa under the shelves, cushions on it */}
      <Model path="reading/sofa_01.glb" p={[-0.3, 0, back + 1.2]} s={s} />
      <Model path="reading/throw_pillows_01.glb" p={[-0.3, 0.5, back + 1.12]} s={1.1} />
      {/* armchair turned towards the room, front right */}
      <Model path="reading/armchair_01.glb" p={[1.25, 0, 1.55]} rot={-0.75} s={s} />
      {/* side table with tea on the left, a plant in the corner, the oil lamp on the cabinet at the back */}
      <Model path="reading/side_table_01.glb" p={[-w / 2 + 0.5, 0, 0.55]} s={1.1} />
      <Model path="reading/tea_set_01.glb" p={[-w / 2 + 0.5, 0.6, 0.55]} rot={0.4} s={0.5} />
      <Model path="reading/potted_plant_02.glb" p={[-w / 2 + 0.45, 0, -0.75]} s={1.3} />
      <Model path="reading/vintage_oil_lamp.glb" p={[0.85, 0.6, back + 0.55]} s={0.8} />
    </>
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

      {/* real furniture once loaded; boxes until then */}
      <Suspense fallback={<BoxFurniture back={back} />}><RealFurniture w={w} back={back} /></Suspense>

      {/* Persian rug */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0.55]}>
        <planeGeometry args={[3.2, 2.4]} />
        <meshStandardMaterial map={tex.rug} roughness={1} />
      </mesh>

      {/* floor lamp (right) and table lamp on a side table (left) */}
      <group position={[1.6, 0, 0.1]}>
        <Cy p={[0, 0.02, 0]} rt={0.16} rb={0.18} h={0.04} c="#3a2a12" m={0.6} r={0.4} />
        <Cy p={[0, 0.9, 0]} rt={0.015} rb={0.015} h={1.8} c="#6a4a1a" m={0.7} r={0.35} />
        <Cy p={[0, 1.88, 0]} rt={0.17} rb={0.27} h={0.36} c="#f6dcae" e="#ffc46b" ei={1.6} />
        <pointLight position={[0, 1.7, 0.1]} color="#ffbe6b" intensity={9} distance={5} decay={1.6} />
      </group>
      {/* real parquet floor and wood panelling once their textures have loaded */}
      <Suspense fallback={null}><Panelling w={w} /></Suspense>
      <group position={[0.85, 0, back + 0.55]}>
        <B p={[0, 0.3, 0]} s={[0.4, 0.6, 0.4]} c="#2f1c0e" />
      </group>

      {[-0.9, 0.7].map(x => <Down key={x} x={x} z={0.2} k={1.6} color="#ffd59a" />)}
      <pointLight position={[0, H - 0.6, 0.5]} color="#ffcf8f" intensity={10} distance={7} decay={1.6} />
    </group>
  );
}
