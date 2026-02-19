import type { Locations } from "@/components/TopDown";

export interface RouteWithOrder {
  x?: number | null;
  y?: number | null;
  order?: number | null;
  id?: string;
}

type Axis = "x" | "y";
type Direction = "asc" | "desc";

/** Box in viewBox coords: xMin ≤ x ≤ xMax and yMin ≤ y ≤ yMax. */
export interface OrderArea {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

/**
 * High-level segment: "Between these y (or x) coords, or inside this box, order by increasing (or decreasing) x (or y)."
 * Segments are in display order (first segment = first in list).
 * Use either range (1D band) or area (2D box)—not both.
 */
export type RangeOrderSegment =
  | {
      range: { axis: Axis; min: number; max: number };
      orderBy: { axis: Axis; dir: Direction };
    }
  | {
      area: OrderArea;
      orderBy: { axis: Axis; dir: Direction };
    };

const AXIS_MAX = 500; // viewBox-ish; used to invert for desc

function rangeContains(
  route: RouteWithOrder,
  range: { axis: Axis; min: number; max: number }
): boolean {
  const v = range.axis === "x" ? route.x : route.y;
  return typeof v === "number" && v >= range.min && v <= range.max;
}

function areaContains(route: RouteWithOrder, area: OrderArea): boolean {
  const x = route.x;
  const y = route.y;
  return (
    typeof x === "number" &&
    typeof y === "number" &&
    x >= area.xMin &&
    x <= area.xMax &&
    y >= area.yMin &&
    y <= area.yMax
  );
}

function segmentContains(route: RouteWithOrder, segment: RangeOrderSegment): boolean {
  if ("range" in segment) return rangeContains(route, segment.range);
  return areaContains(route, segment.area);
}

function positionKey(route: RouteWithOrder, orderBy: RangeOrderSegment["orderBy"]): number {
  const primary = orderBy.axis === "x" ? (route.x as number) : (route.y as number);
  const tieBreaker = orderBy.axis === "x" ? (route.y as number) : (route.x as number);
  const k = orderBy.dir === "asc" ? primary : AXIS_MAX - primary;
  return k * 1000 + (tieBreaker ?? 0);
}

/**
 * Between these y (or x) coords, order by increasing (or decreasing) x (or y).
 * Returns a sort key for the route using the first matching segment; segments are in display order.
 */
export function getOrderKeyByRangeSegments(
  route: RouteWithOrder,
  segments: RangeOrderSegment[]
): number {
  const idx = segments.findIndex(s => segmentContains(route, s));
  const segment = idx >= 0 ? segments[idx] : null;
  const segmentKey = idx >= 0 ? idx * 1e6 : 1e9;
  const pos = segment ? positionKey(route, segment.orderBy) : 0;
  return segmentKey + pos;
}

/**
 * Returns a numeric sort key for a route on a given wall.
 * Left-to-right display order = ascending sort key.
 * Uses x/y when present; otherwise falls back to order (then stable id/index).
 */
export function getOrderKey(route: RouteWithOrder, wall: Locations, index: number): number {
  const x = route.x;
  const y = route.y;
  const hasCoords = typeof x === "number" && typeof y === "number";

  if (hasCoords) {
    switch (wall) {
      case "ABWall":
        // Vertical line: left = higher y → order by y decreasing
        return getOrderKeyByRangeSegments(route, [
          {
            range: { axis: "y", min: -AXIS_MAX, max: AXIS_MAX },
            orderBy: { axis: "y", dir: "desc" },
          },
        ]);
      case "boulderSouth": {
        // Sideways U: left column first (x asc), within column higher y first (y desc)
        return getOrderKeyByRangeSegments(route, [
          { range: { axis: "y", min: 140, max: 155 }, orderBy: { axis: "x", dir: "desc" } },
          { range: { axis: "y", min: 156, max: 232 }, orderBy: { axis: "y", dir: "asc" } },
          { range: { axis: "y", min: 233, max: 240 }, orderBy: { axis: "x", dir: "desc" } },
        ]);
      }
      case "ropeSouth":
        return getOrderKeyByRangeSegments(route, [
          {
            area: { xMin: 160, xMax: 200, yMin: 170, yMax: 200 },
            orderBy: { axis: "y", dir: "desc" },
          },
          {
            area: { xMin: 135, xMax: 186, yMin: 114, yMax: 169 },
            orderBy: { axis: "x", dir: "desc" },
          },
          {
            area: { xMin: 99, xMax: 134, yMin: 114, yMax: 142 },
            orderBy: { axis: "x", dir: "desc" },
          },
          {
            area: { xMin: 90, xMax: 108, yMin: 143, yMax: 200 },
            orderBy: { axis: "y", dir: "asc" },
          },
        ]);
      case "ropeNorthWest":
        // Example: between these y coords order by x; between other y coords order by y, etc.
        return getOrderKeyByRangeSegments(route, [
          { range: { axis: "y", min: 0, max: 31 }, orderBy: { axis: "x", dir: "asc" } },
          { range: { axis: "y", min: 32, max: 60 }, orderBy: { axis: "y", dir: "asc" } },
        ]);
      case "ropeNorthEast":
        return x;
      case "boulderNorth":
        return getOrderKeyByRangeSegments(route, [
          { range: { axis: "y", min: 0, max: 20 }, orderBy: { axis: "x", dir: "asc" } },
          { range: { axis: "y", min: 21, max: 57 }, orderBy: { axis: "y", dir: "asc" } },
          { range: { axis: "y", min: 58, max: 97 }, orderBy: { axis: "x", dir: "desc" } },
        ]);
      case "boulderMiddle":
        return getOrderKeyByRangeSegments(route, [
          { range: { axis: "x", min: 190, max: 210 }, orderBy: { axis: "y", dir: "asc" } },
          { range: { axis: "x", min: 212, max: 280 }, orderBy: { axis: "x", dir: "asc" } },
        ]);
      default:
        return -y! * 1000 + x!;
    }
  }

  const order = route.order;
  if (typeof order === "number") {
    return order * 1e6 + index;
  }
  return 1e9 + index;
}

/**
 * Sorts routes by wall-specific display order (left-to-right).
 * Uses x/y when present with wall-specific rules; otherwise order, then stable by index.
 */
export function sortRoutesByWall<T extends RouteWithOrder>(routes: T[], wall: Locations): T[] {
  return routes
    .map((r, i) => ({ r, i }))
    .sort((a, b) => getOrderKey(a.r, wall, a.i) - getOrderKey(b.r, wall, b.i))
    .map(({ r }) => r);
}
