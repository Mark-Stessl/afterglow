import type { RoomId } from '../rooms';

/**
 * Line drawings of each room's furniture, seen through the window.
 * Placeholders for the flat overview; the 3D rooms replace them later.
 */
const ART: Record<RoomId, React.ReactNode> = {
  trophies: (
    <>
      <path d="M20 54h120" />
      <path d="M40 54V30h20v24M100 54V22h20v32" opacity=".5" />
      <path d="M66 20h28v8a14 14 0 0 1-28 0z" />
      <path d="M80 42v6M72 52h16" />
      <path d="M66 24h-6a6 6 0 0 0 6 8M94 24h6a6 6 0 0 1-6 8" />
    </>
  ),
  cinema: (
    <>
      <rect x="34" y="12" width="92" height="30" rx="2" />
      <path d="M30 10c6 10 6 26 0 36M130 10c-6 10-6 26 0 36" opacity=".6" />
      <path d="M36 56c0-4 4-6 8-6s8 2 8 6M60 56c0-4 4-6 8-6s8 2 8 6M84 56c0-4 4-6 8-6s8 2 8 6M108 56c0-4 4-6 8-6s8 2 8 6" opacity=".7" />
    </>
  ),
  games: (
    <>
      <rect x="44" y="12" width="72" height="30" rx="2" />
      <path d="M80 42v6M66 48h28" />
      <path d="M24 56h112" opacity=".5" />
      <path d="M32 56V34c0-3 2-4 4-4h4c2 0 4 1 4 4v22" />
      <rect x="120" y="44" width="18" height="11" rx="3" opacity=".7" />
    </>
  ),
  living: (
    <>
      <rect x="54" y="10" width="52" height="28" rx="3" />
      <path d="M68 44l12-6 12 6" opacity=".6" />
      <path d="M30 58V50c0-3 2-5 5-5h90c3 0 5 2 5 5v8" />
      <path d="M40 45v-5h80v5" opacity=".7" />
    </>
  ),
  reading: (
    <>
      <path d="M118 58V22M110 22h16l-4-10h-8z" />
      <path d="M40 58V40c0-4 3-6 6-6h28c3 0 6 2 6 6v18M36 46h48" />
      <path d="M96 58h12M96 52h12M97 46h10" opacity=".7" />
    </>
  ),
};

export function RoomArt({ id }: { id: RoomId }) {
  return (
    <svg
      viewBox="0 0 160 64"
      className="absolute inset-0 h-full w-full"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      preserveAspectRatio="xMidYMax meet"
    >
      {ART[id]}
    </svg>
  );
}
