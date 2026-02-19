/**
 * Route color options used by the color picker (RouteEditPopup) and map dots (TopDown).
 * Single source of truth so dots always match the picker.
 */
export const ROUTE_COLOR_OPTIONS: { name: string; hex: string }[] = [
  { name: 'black', hex: '#000000' },
  { name: 'white', hex: '#FFFFFF' },
  { name: 'brown', hex: '#8B4513' },
  { name: 'red', hex: '#EF4444' },
  { name: 'blue', hex: '#3B82F6' },
  { name: 'yellow', hex: '#EAB308' },
  { name: 'green', hex: '#22C55E' },
  { name: 'orange', hex: '#F97316' },
  { name: 'pink', hex: '#EC4899' },
  { name: 'purple', hex: '#A855F7' },
];

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const match = hex.replace(/^#/, '').match(/^(?:[0-9a-f]{3}){1,2}$/i);
  if (!match) return null;
  const s = hex.slice(1);
  const n = s.length === 3 ? 1 : 2;
  return {
    r: parseInt(s.slice(0, n), 16) * (n === 1 ? 17 : 1),
    g: parseInt(s.slice(n, 2 * n), 16) * (n === 1 ? 17 : 1),
    b: parseInt(s.slice(2 * n, 3 * n), 16) * (n === 1 ? 17 : 1),
  };
}

/**
 * Resolve a route color (name or hex) to the canonical hex used in the picker.
 * Use this when rendering route dots so they match the color picker exactly.
 * @param routeColor - Stored color (name or hex).
 * @param opacity - Optional 0–1 opacity; when set, returns rgba(...) instead of hex.
 */
export function getRouteDisplayColor(routeColor: string, opacity?: number): string {
  if (!routeColor?.trim()) routeColor = ROUTE_COLOR_OPTIONS[0].hex;
  const byName = ROUTE_COLOR_OPTIONS.find(
    (c) => c.name.toLowerCase() === routeColor.toLowerCase()
  );
  const hex = byName?.hex ?? ROUTE_COLOR_OPTIONS.find(
    (c) => c.hex.toLowerCase() === routeColor.toLowerCase()
  )?.hex ?? routeColor;
  if (opacity !== undefined && opacity !== null) {
    const rgb = hexToRgb(hex);
    if (rgb) {
      const a = Math.max(0, Math.min(1, Number(opacity)));
      return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
    }
  }
  return hex;
}
