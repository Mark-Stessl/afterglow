/**
 * Surfaces painted on small canvases at runtime: wood, marble, rugs, posters, screens, books.
 * Nothing is downloaded, so there are no external images and no CORS problems.
 */
import * as THREE from 'three';

const cache = new Map<string, THREE.CanvasTexture>();

function make(key: string, w: number, h: number, draw: (g: CanvasRenderingContext2D, w: number, h: number) => void, repeat?: [number, number]) {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d')!, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  cache.set(key, t);
  return t;
}

/** Small deterministic random so every load looks the same. */
export function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

const noise = (g: CanvasRenderingContext2D, w: number, h: number, a: number, seed = 1) => {
  const r = rng(seed);
  for (let i = 0; i < (w * h) / 6; i++) {
    g.fillStyle = `rgba(${r() < 0.5 ? '0,0,0' : '255,255,255'},${r() * a})`;
    g.fillRect(r() * w, r() * h, 1 + r() * 2, 1);
  }
};

/** Wooden floor planks. */
export const planks = (base: string, dark: string, key = 'planks') => make(`${key}${base}`, 512, 512, (g, w, h) => {
  const r = rng(7);
  const rows = 8;
  for (let y = 0; y < rows; y++) {
    let x = -r() * 200;
    while (x < w) {
      const len = 160 + r() * 200;
      g.fillStyle = base;
      g.fillRect(x, (y * h) / rows, len, h / rows);
      g.globalAlpha = 0.18 + r() * 0.25;
      g.fillStyle = dark;
      g.fillRect(x, (y * h) / rows, len, h / rows);
      g.globalAlpha = 1;
      for (let k = 0; k < 6; k++) {
        g.strokeStyle = `rgba(0,0,0,${0.05 + r() * 0.08})`;
        g.beginPath();
        const yy = (y * h) / rows + r() * (h / rows);
        g.moveTo(x, yy); g.bezierCurveTo(x + len / 3, yy + 3, x + (2 * len) / 3, yy - 3, x + len, yy);
        g.stroke();
      }
      g.fillStyle = 'rgba(0,0,0,.45)';
      g.fillRect(x, (y * h) / rows, 2, h / rows);
      x += len;
    }
    g.fillStyle = 'rgba(0,0,0,.5)';
    g.fillRect(0, (y * h) / rows, w, 2);
  }
}, [2, 2]);

/** Vertical wood panelling (reading room, trophy room). */
export const panels = (base: string, key = 'panels') => make(`${key}${base}`, 512, 512, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const r = rng(3);
  for (let i = 0; i < 260; i++) {
    g.strokeStyle = `rgba(0,0,0,${0.04 + r() * 0.07})`;
    const x = r() * w;
    g.beginPath(); g.moveTo(x, 0); g.bezierCurveTo(x + 6, h / 3, x - 6, (2 * h) / 3, x + 3, h); g.stroke();
  }
  // raised panels
  for (let c = 0; c < 2; c++) for (let rr = 0; rr < 2; rr++) {
    const px = c * (w / 2) + 20, py = rr * (h / 2) + 20, pw = w / 2 - 40, ph = h / 2 - 40;
    g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 4; g.strokeRect(px, py, pw, ph);
    g.strokeStyle = 'rgba(255,220,170,.10)'; g.lineWidth = 2; g.strokeRect(px + 4, py + 4, pw - 8, ph - 8);
  }
}, [2, 1]);

/** White marble with grey veins. */
export const marble = (key = 'marble', base = '#e9e6e1') => make(key, 512, 512, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  const r = rng(11);
  for (let v = 0; v < 14; v++) {
    g.strokeStyle = `rgba(90,90,100,${0.12 + r() * 0.3})`;
    g.lineWidth = 0.6 + r() * 2.2;
    g.beginPath();
    let x = r() * w, y = 0;
    g.moveTo(x, y);
    while (y < h) { x += (r() - 0.5) * 60; y += 20 + r() * 40; g.lineTo(x, y); }
    g.stroke();
  }
  noise(g, w, h, 0.05, 2);
});

/** Persian-style rug: red field, dark border, medallion. */
export const persian = () => make('persian', 512, 384, (g, w, h) => {
  g.fillStyle = '#5c1712'; g.fillRect(0, 0, w, h);
  g.fillStyle = '#26110e'; g.fillRect(14, 14, w - 28, h - 28);
  g.fillStyle = '#7e2418'; g.fillRect(40, 40, w - 80, h - 80);
  g.strokeStyle = '#c39a5a'; g.lineWidth = 3; g.strokeRect(34, 34, w - 68, h - 68);
  const r = rng(5);
  for (let i = 0; i < 900; i++) {
    g.fillStyle = ['#a8462e', '#3a1410', '#c39a5a', '#1f2a4a'][Math.floor(r() * 4)];
    g.globalAlpha = 0.35;
    g.fillRect(40 + r() * (w - 80), 40 + r() * (h - 80), 3, 3);
  }
  g.globalAlpha = 1;
  g.fillStyle = '#1f2a4a';
  g.beginPath(); g.ellipse(w / 2, h / 2, 80, 55, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#c39a5a'; g.lineWidth = 4; g.stroke();
  g.fillStyle = '#a8462e';
  g.beginPath(); g.ellipse(w / 2, h / 2, 40, 26, 0, 0, Math.PI * 2); g.fill();
});

/** Soft looped carpet / rug in one tone. */
export const rug = (base: string, key: string) => make(`rug${key}`, 256, 256, (g, w, h) => {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  noise(g, w, h, 0.12, 9);
});

/** Movie poster: dark art with a light figure and a title band. */
export const poster = (seed: number) => make(`poster${seed}`, 128, 192, (g, w, h) => {
  const r = rng(seed);
  const hue = Math.floor(r() * 360);
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, `hsl(${hue} 50% 30%)`); grd.addColorStop(1, `hsl(${(hue + 30) % 360} 40% 8%)`);
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = `hsl(${(hue + 180) % 360} 60% 70% / .8)`;
  g.beginPath(); g.arc(w / 2, h * 0.42, w * 0.22, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(0,0,0,.7)';
  g.fillRect(w * 0.35, h * 0.5, w * 0.3, h * 0.35);
  g.fillStyle = 'rgba(255,255,255,.85)'; g.fillRect(w * 0.15, h * 0.08, w * 0.7, 8);
  g.fillRect(w * 0.25, h * 0.88, w * 0.5, 4);
});

/** Game console home screen: wallpaper plus a row of tiles. */
export const consoleUI = () => make('consoleUI', 512, 288, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, w, h);
  grd.addColorStop(0, '#0b1d5c'); grd.addColorStop(0.5, '#3b1f7a'); grd.addColorStop(1, '#0a2a52');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  // nebula
  for (let i = 0; i < 6; i++) {
    const rg = g.createRadialGradient(80 + i * 70, 70 + (i % 2) * 40, 0, 80 + i * 70, 70 + (i % 2) * 40, 90);
    rg.addColorStop(0, `hsla(${200 + i * 25},90%,65%,.35)`); rg.addColorStop(1, 'transparent');
    g.fillStyle = rg; g.fillRect(0, 0, w, h);
  }
  const cols = ['#e94e77', '#f5b544', '#36c3ff', '#7ee081', '#b07cff', '#ff7b3d', '#3d8bff'];
  cols.forEach((c, i) => {
    const x = 26 + i * 68, y = 170;
    g.fillStyle = c; g.fillRect(x, y, 58, i === 0 ? 74 : 58);
    g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x, y, 58, 10);
  });
  g.fillStyle = 'rgba(255,255,255,.9)'; g.fillRect(26, 140, 120, 8);
});

/** Monitor showing a game: bright scene. */
export const monitorUI = (seed: number) => make(`monitor${seed}`, 256, 144, (g, w, h) => {
  const r = rng(seed);
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, `hsl(${190 + r() * 40} 80% 45%)`); grd.addColorStop(1, `hsl(${260 + r() * 40} 70% 25%)`);
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(10,10,30,.8)';
  g.beginPath(); g.moveTo(0, h); g.lineTo(w * 0.3, h * 0.5); g.lineTo(w * 0.55, h * 0.75); g.lineTo(w * 0.8, h * 0.4); g.lineTo(w, h); g.fill();
});

/** Night outside a window: dark sky, city glow, a tree. */
export const night = () => make('night', 256, 512, (g, w, h) => {
  const grd = g.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, '#0b1424'); grd.addColorStop(0.7, '#1b2a33'); grd.addColorStop(1, '#0d1410');
  g.fillStyle = grd; g.fillRect(0, 0, w, h);
  const r = rng(4);
  for (let i = 0; i < 25; i++) { g.fillStyle = `rgba(255,210,140,${0.2 + r() * 0.5})`; g.fillRect(r() * w, h * 0.55 + r() * h * 0.2, 2, 2); }
  g.fillStyle = '#132a1a';
  for (let i = 0; i < 40; i++) { g.beginPath(); g.arc(w * 0.5 + (r() - 0.5) * 160, h * 0.5 + (r() - 0.5) * 200, 20 + r() * 30, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = '#0a1710'; g.fillRect(w * 0.48, h * 0.6, 10, h * 0.4);
});

/** Framed art: abstract with a figure. */
export const art = (seed: number, light = true) => make(`art${seed}${light}`, 192, 256, (g, w, h) => {
  const r = rng(seed);
  g.fillStyle = light ? '#e8e2d6' : '#1a1a1c'; g.fillRect(0, 0, w, h);
  g.fillStyle = light ? '#2a2a2c' : '#d9d2c4';
  g.beginPath(); g.ellipse(w * (0.35 + r() * 0.3), h * 0.55, w * 0.22, h * 0.3, r(), 0, Math.PI * 2); g.fill();
  g.fillStyle = `hsla(${r() * 40},60%,40%,.7)`; g.fillRect(w * 0.2, h * 0.15, w * 0.3, h * 0.12);
});

/** Football shirt in a frame. */
export const jersey = (seed: number) => make(`jersey${seed}`, 160, 200, (g, w, h) => {
  const r = rng(seed);
  g.fillStyle = '#111215'; g.fillRect(0, 0, w, h);
  const c = ['#f2f2f2', '#b3122e', '#1d3f9e', '#0f0f10'][seed % 4];
  g.fillStyle = c;
  g.beginPath();
  g.moveTo(w * 0.3, h * 0.2); g.lineTo(w * 0.7, h * 0.2); g.lineTo(w * 0.9, h * 0.35); g.lineTo(w * 0.78, h * 0.45); g.lineTo(w * 0.72, h * 0.4);
  g.lineTo(w * 0.72, h * 0.82); g.lineTo(w * 0.28, h * 0.82); g.lineTo(w * 0.28, h * 0.4); g.lineTo(w * 0.22, h * 0.45); g.lineTo(w * 0.1, h * 0.35);
  g.closePath(); g.fill();
  g.fillStyle = c === '#f2f2f2' ? '#1d3f9e' : '#f2f2f2';
  g.font = 'bold 34px sans-serif'; g.textAlign = 'center';
  g.fillText(String(7 + Math.floor(r() * 20)), w / 2, h * 0.65);
});

/** Book spines for instanced shelves: one strip of many colours, sampled per book. */
/** The film on the cinema screen: a painted evening sky with soft clouds, a wooded hill with a castle on the right. */
export const screenScene = () => make('screenScene', 768, 400, (g, w, h) => {
  const r = rng(77);
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#4f79b8'); sky.addColorStop(0.55, '#9db6d6'); sky.addColorStop(1, '#c9c6d4');
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  // clouds: clusters of soft puffs, warm light from the lower right
  const puff = (x: number, y: number, rad: number) => {
    const c = g.createRadialGradient(x - rad * 0.2, y - rad * 0.3, rad * 0.1, x, y, rad);
    c.addColorStop(0, 'rgba(255,246,232,.95)'); c.addColorStop(0.6, 'rgba(244,214,190,.75)'); c.addColorStop(1, 'rgba(200,190,210,0)');
    g.fillStyle = c; g.beginPath(); g.arc(x, y, rad, 0, Math.PI * 2); g.fill();
  };
  [[80, 230, 1.2], [200, 150, 1], [120, 330, 1.4], [330, 300, 0.9], [60, 90, 0.7]].forEach(([cx, cy, k]) => {
    for (let i = 0; i < 14; i++) puff(cx + (r() - 0.5) * 170 * k, cy + (r() - 0.5) * 60 * k, (18 + r() * 28) * k);
  });
  // the hill, dark at the foot, trees as layered blobs
  g.fillStyle = '#1c2e1c';
  g.beginPath(); g.moveTo(w * 0.42, h); g.bezierCurveTo(w * 0.55, h * 0.75, w * 0.68, h * 0.36, w * 0.8, h * 0.32); g.lineTo(w, h * 0.3); g.lineTo(w, h); g.fill();
  // canopy: many small overlapping leaf clumps, lighter near the top, softened a little
  g.filter = 'blur(1.2px)';
  for (let i = 0; i < 900; i++) {
    const x = w * (0.45 + r() * 0.55), top = h * (0.32 + Math.max(0, (0.8 - (x / w)) * 1.2));
    const y = top + Math.pow(r(), 0.7) * (h - top);
    const lit = 1 - (y - top) / (h - top + 1);
    g.fillStyle = `hsl(${100 + r() * 25} ${28 + r() * 14}% ${12 + lit * 22 + r() * 8}%)`;
    g.beginPath(); g.arc(x, y, 3 + r() * 7, 0, Math.PI * 2); g.fill();
  }
  g.filter = 'none';
  // a few dark pines on the left slope
  for (let i = 0; i < 9; i++) {
    const x = w * (0.5 + r() * 0.12), y = h * (0.62 + r() * 0.3), s = 18 + r() * 22;
    g.fillStyle = '#1f3524'; g.beginPath(); g.moveTo(x, y - s * 1.6); g.lineTo(x - s * 0.5, y); g.lineTo(x + s * 0.5, y); g.fill();
  }
  // the castle on the hilltop, lit by the evening sun
  const cx = w * 0.74, cy = h * 0.3;
  g.fillStyle = '#d9a86a'; g.fillRect(cx - 50, cy - 26, 100, 30); g.fillRect(cx - 12, cy - 48, 30, 26);
  g.fillStyle = '#6b4a3a';
  g.beginPath(); g.moveTo(cx - 56, cy - 24); g.lineTo(cx, cy - 44); g.lineTo(cx + 56, cy - 24); g.fill();
  g.beginPath(); g.moveTo(cx - 16, cy - 46); g.lineTo(cx + 3, cy - 64); g.lineTo(cx + 22, cy - 46); g.fill();
  g.fillStyle = '#ffe2a8';
  for (let i = 0; i < 7; i++) g.fillRect(cx - 42 + i * 13, cy - 14, 5, 7);
});

export const BOOK_COLORS =['#5a1d18', '#2f3a24', '#6b4a24', '#1d2a3c', '#7a5a30', '#3c1a1a', '#4a3b2a', '#20302a', '#8a6a3a', '#2a2018', '#5c4630', '#3a2c4a'];
