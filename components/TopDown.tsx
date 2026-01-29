import React, { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Text, View } from 'react-native';
import Svg, { Circle, Defs, G, Pattern, Polygon, Rect, Line as SvgLine, Text as SvgText } from 'react-native-svg';

// Locations enum matching Prisma schema
export type Locations =
  | 'ropeNorthWest'
  | 'ropeNorthEast'
  | 'ABWall'
  | 'ropeSouth'
  | 'boulderSouth'
  | 'boulderMiddle'
  | 'boulderNorth'
  ;

// Wall type for color coding
type WallType = 'rope' | 'boulder';

// Color scheme matching web app (blue for rope, purple for boulder)
const COLORS = {
  rope: {
    default: '#1447E6', // blue-500 (matches web blue-button)
    selected: '#22C55E', // green
    dimmed: '#0A2E8F', // darker blue for non-selected walls when something is selected
  },
  boulder: {
    default: '#8200DB', // purple-400 (matches web purple-button outline)
    selected: '#22C55E', // green-500
    dimmed: '#4D0099', // darker purple for non-selected walls when something is selected
  },
};

// ============================================================================
// WALL SEGMENT CONFIGURATION - Easy to edit!
// ============================================================================

/**
 * Wall Segment Configuration
 * 
 * Each segment can be either a rectangle or triangle.
 * Edit these values to adjust wall positions, sizes, and rotations.
 */
interface WallSegment {
  /** Shape type: 'rect' for rectangle, 'triangle' for triangle */
  shape?: 'rect' | 'triangle';
  /** X position in viewBox coordinates (center point for isosceles triangles, right angle corner for right triangles) */
  x: number;
  /** Y position in viewBox coordinates (center point for isosceles triangles, right angle corner for right triangles) */
  y: number;
  /** Width of the wall segment (for rectangles) or base width (for triangles) */
  width: number;
  /** Height/length of the wall segment (for rectangles) or height (for triangles) */
  height: number;
  /** Rotation in degrees (0 = vertical, 90 = horizontal) */
  rotation?: number;
  /** For triangles: points array [x1,y1 x2,y2 x3,y3] - if provided, overrides x/y/width/height */
  points?: string;
  /** For right triangles: which corner is the right angle (x,y is the right angle corner) */
  rightAngleCorner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
}

/**
 * Wall Definition
 * 
 * Groups multiple segments that make up a single wall section.
 */
interface WallDefinition {
  /** Type of wall (determines color) */
  type: WallType;
  /** Array of segments that form this wall */
  segments: WallSegment[];
}

/**
 * WALL CONFIGURATION
 * 
 * Edit this object to modify wall positions, sizes, and layouts.
 * All coordinates are in viewBox space (0-300 width, 0-200 height).
 * 
 * Segment types:
 * - Rectangle: { shape: 'rect', x, y, width, height, rotation? }
 * - Triangle (isosceles): { shape: 'triangle', x, y, width, height, rotation? }
 *   - Creates triangle with point at top, base at bottom
 *   - Rotation rotates around center point (x, y)
 * - Triangle (right): { shape: 'triangle', x, y, width, height, rightAngleCorner: 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right', rotation? }
 *   - Creates right triangle with right angle at (x,y) in specified corner
 *   - Rotation rotates around the right angle corner (x, y)
 *   - 'bottom-left': right angle at bottom-left, extends right and up
 *   - 'bottom-right': right angle at bottom-right, extends left and up
 *   - 'top-left': right angle at top-left, extends right and down
 *   - 'top-right': right angle at top-right, extends left and down
 *   - Example: { shape: 'triangle', x: 50, y: 100, width: 30, height: 40, rightAngleCorner: 'top-left', rotation: 45 }
 * - Triangle (custom): { shape: 'triangle', points: 'x1,y1 x2,y2 x3,y3', rotation? }
 */
const WALL_DEFINITIONS: Record<Locations, WallDefinition> = {
  // ========== ROPE WALLS ==========

  //merge southwest and southeast into south for the future
  ropeSouth: {
    type: 'rope',
    segments: [
      { x: 175, y: 185, width: 12, height: 20 },
      { x: 159, y: 180, width: 12, height: 25, rotation: 305 },
      { x: 152, y: 164, width: 12, height: 18, rotation: 335 },
      { x: 163, y: 159, width: 12, height: 30, rotation: 115 },
      { x: 135, y: 146, width: 12, height: 38, rotation: 70 },
      { x: 111.1, y: 220, width: 12, height: 60, rotation: 180 },
    ],
  },
  ABWall: {
    type: 'rope',
    segments: [
      { x: 10, y: 25, width: 12, height: 125 },
      { x: 10, y: 151, width: 12, height: 25, rotation: -45 },
      { x: 25, y: 160, width: 12, height: 40, rotation: 0 },
    ],
  },
  ropeNorthWest: {
    type: 'rope',
    segments: [
      { x: -8, y: 12, width: 12, height: 19.5, rotation: -45 },
      {
        shape: 'triangle',
        x: 14,
        y: 17,
        width: 12,
        height: 12,
        rightAngleCorner: 'top-left',
        rotation: 45
      },
      { x: 10, y: -5, width: 12, height: 30, rotation: -45 },
      { x: 32, y: 16, width: 12, height: 55, rotation: -90 },
      {
        x: 108.75, y: 25.5, width: 12, height: 30, rotation: -225
      },
      { x: 97, y: 26.2, width: 12, height: 10 },
      {
        shape: 'triangle',
        x: 97,
        y: 36,
        width: 12,
        height: 12,
        rightAngleCorner: 'top-left'
      }
    ],
  },
  ropeNorthEast: {
    type: 'rope',
    segments: [
      {
        shape: 'triangle',
        x: 109,
        y: 48,
        width: 12.5,
        height: 12.5,
        rightAngleCorner: 'bottom-right'
      },
      { x: 109, y: 48, width: 12, height: 15, rotation: 270 },
      { x: 124, y: 48, width: 12, height: 40, rotation: 208 },
      { x: 133, y: 19, width: 12, height: 42, rotation: 270 },
      { x: 175, y: 19, width: 12, height: 23, rotation: 245 },
      {
        shape: 'triangle',
        x: 187,
        y: .6,
        width: 12.5,
        height: 12.5,
        rightAngleCorner: 'top-right',
        rotation: 225
      },
    ],
  },

  // ========== BOULDER WALLS ==========


  // merge northcave and northslab into north for the future
  boulderNorth: {
    type: 'boulder',
    segments: [
      { x: 195, y: 8, width: 12, height: 50.5, rotation: 270 },

      { x: 239, y: 6, width: 12, height: 25, rotation: 305 },
      { x: 258, y: 20, width: 12, height: 20, rotation: 270 },
      { x: 266, y: 19, width: 12, height: 44 },
      { x: 278, y: 63, width: 12, height: 56.1, rotation: 90 },
      {
        shape: 'triangle',
        x: 222,
        y: 63,
        width: 12,
        height: 12,
        rightAngleCorner: 'top-right',

      },


    ],
  },
  boulderMiddle: {
    type: 'boulder',
    segments: [
      {
        shape: 'triangle',
        x: 210.3,
        y: 75,
        width: 12,
        height: 12,
        rightAngleCorner: 'bottom-left',

      },
      { x: 210.3, y: 75, width: 12, height: 30 },
      { x: 210.3, y: 107, width: 12, height: 30, rotation: 280 },
      { x: 240, y: 112, width: 12, height: 20, rotation: 220 },
      { x: 244, y: 101, width: 12, height: 38, rotation: 270 },

    ],
  },
  boulderSouth: {
    type: 'boulder',
    segments: [
      { x: 242, y: 148, width: 12, height: 40, rotation: 270 },
      { x: 242, y: 140, width: 12, height: 30, rotation: 0 },
      { x: 248, y: 168, width: 12, height: 20 },
      { x: 248, y: 190, width: 12, height: 35, rotation: 270 },
    ],
  },
};

// ============================================================================
// TEXT LABEL CONFIGURATION
// ============================================================================

/**
 * Text Label Definition
 * 
 * Text labels for the map. Background boxes automatically mask overhangs.
 */
interface TextLabel {
  /** X position in viewBox coordinates */
  x: number;
  /** Y position in viewBox coordinates */
  y: number;
  /** Text content */
  text: string;
  /** Font size (default: 12) */
  fontSize?: number;
  /** Text color (default: white) */
  fill?: string;
  /** Background box padding around text (default: 4) */
  padding?: number;
  /** Background box color (default: black with opacity) */
  backgroundColor?: string;
  /** Rotation in degrees (rotates around x, y center point) */
  rotation?: number;
}

/**
 * TEXT LABEL CONFIGURATION
 * 
 * Add text labels here. They will render with background boxes
 * that mask overhangs for readability.
 * 
 * Example:
 * [
 *   { x: 50, y: 100, text: 'North Wall' },
 *   { x: 150, y: 50, text: 'Boulder Area', fontSize: 14, fill: '#fff' },
 *   { x: 200, y: 150, text: 'Rotated Label', rotation: 45 }
 * ]
 */
const TEXT_LABELS: TextLabel[] = [
  // Add your text labels here
  { x: 35, y: 87, text: 'Auto Belay Wall', backgroundColor: '#1976D2', fontSize: 12, fill: '#ffffff', rotation: 90 },

  { x: 125, y: 100, text: 'The Arch', backgroundColor: '#1976D2', fontSize: 12, fill: '#ffffff' },

  { x: 220, y: 20, text: 'Slab', backgroundColor: '#8200DB', fontSize: 12, fill: '#ffffff' },
];

// ============================================================================
// OVERHANG CONFIGURATION
// ============================================================================

/**
 * Overhang Definition
 * 
 * Overhangs are visual indicators for overhanging sections of walls.
 * They use a diagonal line pattern and render underneath walls.
 * They are NOT selectable.
 */
interface OverhangSegment {
  /** X position in viewBox coordinates (not needed if using points) */
  x?: number;
  /** Y position in viewBox coordinates (not needed if using points) */
  y?: number;
  /** Width of the overhang area (not needed if using points) */
  width?: number;
  /** Height of the overhang area (not needed if using points) */
  height?: number;
  /** Rotation in degrees */
  rotation?: number;
  /** Shape type: 'rect' for rectangle, 'triangle' for triangle, 'polygon' for custom polygon */
  shape?: 'rect' | 'triangle' | 'polygon';
  /** For right triangles: which corner is the right angle */
  rightAngleCorner?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  /** For polygons: points string in format "x1,y1 x2,y2 x3,y3 ..." - defines all vertices */
  points?: string;
}

/**
 * OVERHANG CONFIGURATION
 * 
 * Add overhang areas here. They will render with a diagonal line pattern
 * in dark gray underneath the walls.
 * 
 * Examples:
 * - Rectangle: { x: 50, y: 100, width: 30, height: 20 }
 * - Triangle: { shape: 'triangle', x: 80, y: 120, width: 15, height: 15, rightAngleCorner: 'top-left' }
 * - Polygon (custom shape): { shape: 'polygon', points: '10,20 30,20 30,40 10,40' }
 *   - Points format: "x1,y1 x2,y2 x3,y3 ..." (space-separated, comma-separated coordinates)
 *   - Can have any number of vertices to create complex shapes
 */
const OVERHANG_DEFINITIONS: OverhangSegment[] = [
  // Add your overhang areas here
  { x: 258.8, y: 20, width: 12, height: 45, rotation: 0 },
  //boulder overhang
  { shape: 'polygon', points: '211,107 240,110 242,130 255,145 245,165 212,140' },
  { shape: 'polygon', points: '98,48 142,30 160,159 100,160' },
  //rope overhang
];

// ============================================================================
// VIEWBOX CONFIGURATION
// ============================================================================

/**
 * ViewBox Configuration
 * 
 * Adjust these values to change the map's coordinate system.
 * The viewBox defines the coordinate space for all wall segments.
 */
const VIEWBOX_CONFIG = {
  /** Minimum X coordinate */
  minX: 0,
  /** Minimum Y coordinate */
  minY: 0,
  /** Maximum X coordinate (width of coordinate space) */
  maxX: 300,
  /** Maximum Y coordinate (height of coordinate space) */
  maxY: 200,
  /** Display width in pixels */
  displayWidth: 350,
  /** Display height in pixels */
  displayHeight: 233,
};

// ============================================================================
// ============================================================================
// DOT DEFINITION
// ============================================================================

/**
 * Dot Definition
 *
 * A dot rendered on the map in viewBox coordinates (same space as VIEWBOX_CONFIG).
 */
export interface DotDefinition {
  /** X position in viewBox coordinates */
  x: number;
  /** Y position in viewBox coordinates */
  y: number;
  /** Radius in viewBox units (default: 4) */
  r?: number;
  /** Fill color (default: #22C55E green) */
  fill?: string;
  /** Stroke color (default: #FFFFFF white) */
  stroke?: string;
  /** Stroke width in viewBox units (default: 2) */
  strokeWidth?: number;
}

// ============================================================================
// COMPONENT INTERFACES
// ============================================================================

interface TopDownProps {
  onData: (data: Locations | null) => void;
  initialSelection?: Locations | null;
  onViewBoxChange?: (viewBox: { minX: number; minY: number; width: number; height: number }) => void;
  /** Dots to render on the map (viewBox coordinates) */
  dots?: DotDefinition[];
}

interface WallProps {
  selectedPart: Locations | null;
  setSelectedPart: React.Dispatch<React.SetStateAction<Locations | null>>;
  location: Locations;
  definition: WallDefinition;
  opacity?: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate the bounding box and center point of a wall definition
 * Handles all segment types: rectangles, triangles, and polygons
 */
function calculateWallBounds(definition: WallDefinition): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  centerX: number;
  centerY: number;
} {
  if (definition.segments.length === 0) {
    // Return default bounds if no segments
    return {
      minX: 0,
      minY: 0,
      maxX: 0,
      maxY: 0,
      centerX: 0,
      centerY: 0,
    };
  }

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  // Helper function to rotate a point around a center
  const rotatePoint = (
    x: number,
    y: number,
    centerX: number,
    centerY: number,
    rotationDeg: number
  ): [number, number] => {
    if (!rotationDeg) return [x, y];
    const radians = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    const dx = x - centerX;
    const dy = y - centerY;
    return [
      centerX + dx * cos - dy * sin,
      centerY + dx * sin + dy * cos,
    ];
  };

  // Helper function to expand bounds with a point
  const expandBounds = (x: number, y: number) => {
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  };

  definition.segments.forEach((segment) => {
    const shape = segment.shape || 'rect';
    const rotation = segment.rotation || 0;
    const rotationCenterX = segment.x;
    const rotationCenterY = segment.y;

    if (shape === 'triangle' && segment.points) {
      // Custom triangle with points
      const pointPairs = segment.points.trim().split(/\s+/);
      pointPairs.forEach((point) => {
        const [x, y] = point.split(',').map(Number);
        const [rotatedX, rotatedY] = rotatePoint(
          x,
          y,
          rotationCenterX,
          rotationCenterY,
          rotation
        );
        expandBounds(rotatedX, rotatedY);
      });
    } else if (shape === 'triangle') {
      // Triangle generated from x/y/width/height
      let points: Array<[number, number]> = [];

      if (segment.rightAngleCorner) {
        const { x, y, width, height } = segment;
        switch (segment.rightAngleCorner) {
          case 'bottom-left':
            points = [
              [x, y],
              [x + width, y],
              [x, y - height],
            ];
            break;
          case 'bottom-right':
            points = [
              [x, y],
              [x - width, y],
              [x, y - height],
            ];
            break;
          case 'top-left':
            points = [
              [x, y],
              [x + width, y],
              [x, y + height],
            ];
            break;
          case 'top-right':
            points = [
              [x, y],
              [x - width, y],
              [x, y + height],
            ];
            break;
        }
      } else {
        // Isosceles triangle
        const halfWidth = segment.width / 2;
        points = [
          [segment.x, segment.y - segment.height / 2],
          [segment.x - halfWidth, segment.y + segment.height / 2],
          [segment.x + halfWidth, segment.y + segment.height / 2],
        ];
      }

      points.forEach(([x, y]) => {
        const [rotatedX, rotatedY] = rotatePoint(
          x,
          y,
          rotationCenterX,
          rotationCenterY,
          rotation
        );
        expandBounds(rotatedX, rotatedY);
      });
    } else {
      // Rectangle
      const { x, y, width, height } = segment;
      const corners: Array<[number, number]> = [
        [x, y],
        [x + width, y],
        [x, y + height],
        [x + width, y + height],
      ];

      corners.forEach(([cx, cy]) => {
        const [rotatedX, rotatedY] = rotatePoint(
          cx,
          cy,
          rotationCenterX,
          rotationCenterY,
          rotation
        );
        expandBounds(rotatedX, rotatedY);
      });
    }
  });

  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;

  return { minX, minY, maxX, maxY, centerX, centerY };
}

// ============================================================================
// HOOKS
// ============================================================================

function useClickState(
  wallType: WallType,
  id: Locations,
  selectedPart: Locations | null,
  setSelectedPart: React.Dispatch<React.SetStateAction<Locations | null>>,
  hasSelection: boolean
): [string, () => void] {
  const colors = COLORS[wallType];
  const isSelected = selectedPart === id;

  // Use darker color for non-selected walls when something is selected
  // Otherwise use default color
  const fillColor = hasSelection && !isSelected ? colors.dimmed : colors.default;

  const handleClick = () => {
    // Only allow selecting walls, not deselecting
    // Deselection is handled by the zoom-out button
    if (!isSelected) {
      setSelectedPart(id);
    }
  };

  return [fillColor, handleClick];
}

// ============================================================================
// WALL RENDERING COMPONENT
// ============================================================================

/**
 * Renders a single wall section based on its definition
 */
function WallSection({
  selectedPart,
  setSelectedPart,
  location,
  definition,
  opacity,
}: WallProps) {
  const isSelected = selectedPart === location;
  const hasSelection = selectedPart !== null;

  const [fillColor, handleClick] = useClickState(
    definition.type,
    location,
    selectedPart,
    setSelectedPart,
    hasSelection
  );

  // Keep opacity at 1 - we're using darker colors instead of opacity for the dimming effect
  const wallOpacity = 1;

  // Allow clicks on all walls except the currently selected one
  // This allows switching between walls when zoomed in
  // Selected walls are not clickable - use the zoom-out button to deselect
  const isClickable = !isSelected;

  return (
    <G
      onPress={isClickable ? handleClick : undefined}
      fill={fillColor}
      opacity={wallOpacity}
    >
      {definition.segments.map((segment, index) => {
        const shape = segment.shape || 'rect';
        const transform = segment.rotation
          ? `rotate(${segment.rotation} ${segment.x} ${segment.y})`
          : undefined;

        // If triangle with custom points, use those directly
        if (shape === 'triangle' && segment.points) {
          return (
            <Polygon
              key={index}
              points={segment.points}
              transform={transform}
            />
          );
        }

        // If triangle without custom points, generate from x/y/width/height
        if (shape === 'triangle') {
          let points: string;

          // Right triangle: right angle at (x, y)
          if (segment.rightAngleCorner) {
            const { x, y, width, height } = segment;
            switch (segment.rightAngleCorner) {
              case 'bottom-left':
                // Right angle at bottom-left, extends right and up
                points = [
                  `${x},${y}`, // Right angle (bottom-left)
                  `${x + width},${y}`, // Bottom-right
                  `${x},${y - height}`, // Top-left
                ].join(' ');
                break;
              case 'bottom-right':
                // Right angle at bottom-right, extends left and up
                points = [
                  `${x},${y}`, // Right angle (bottom-right)
                  `${x - width},${y}`, // Bottom-left
                  `${x},${y - height}`, // Top-right
                ].join(' ');
                break;
              case 'top-left':
                // Right angle at top-left, extends right and down
                points = [
                  `${x},${y}`, // Right angle (top-left)
                  `${x + width},${y}`, // Top-right
                  `${x},${y + height}`, // Bottom-left
                ].join(' ');
                break;
              case 'top-right':
                // Right angle at top-right, extends left and down
                points = [
                  `${x},${y}`, // Right angle (top-right)
                  `${x - width},${y}`, // Top-left
                  `${x},${y + height}`, // Bottom-right
                ].join(' ');
                break;
            }
          } else {
            // Isosceles triangle: point at top, base at bottom
            const halfWidth = segment.width / 2;
            points = [
              `${segment.x},${segment.y - segment.height / 2}`, // Top point
              `${segment.x - halfWidth},${segment.y + segment.height / 2}`, // Bottom left
              `${segment.x + halfWidth},${segment.y + segment.height / 2}`, // Bottom right
            ].join(' ');
          }

          return (
            <Polygon
              key={index}
              points={points}
              transform={transform}
            />
          );
        }

        // Default: rectangle
        return (
          <Rect
            key={index}
            x={segment.x}
            y={segment.y}
            width={segment.width}
            height={segment.height}
            transform={transform}
          />
        );
      })}
    </G>
  );
}

// ============================================================================
// OVERHANG RENDERING COMPONENT
// ============================================================================

/**
 * Renders overhang areas with diagonal line pattern
 * These are NOT selectable and render underneath walls
 */
function OverhangLayer({ opacity }: { opacity?: number }) {
  const OVERHANG_COLOR = '#4B5563'; // dark gray
  const PATTERN_ID = 'overhang-pattern';

  return (
    <G opacity={opacity !== undefined ? opacity : 1}>
      {/* Pattern definition for diagonal lines */}
      <Defs>
        <Pattern
          id={PATTERN_ID}
          patternUnits="userSpaceOnUse"
          width="8"
          height="8"
        >
          <SvgLine
            x1="0"
            y1="0"
            x2="8"
            y2="8"
            stroke={OVERHANG_COLOR}
            strokeWidth="2"
            opacity="0.6"
          />
        </Pattern>
      </Defs>

      {/* Render all overhang segments */}
      {OVERHANG_DEFINITIONS.map((overhang, index) => {
        const shape = overhang.shape || 'rect';

        // Calculate rotation center - for polygons use center of points, otherwise use x,y
        let rotationCenterX = overhang.x || 0;
        let rotationCenterY = overhang.y || 0;

        if (shape === 'polygon' && overhang.points) {
          // Calculate center of polygon from points
          const pointPairs = overhang.points.trim().split(/\s+/);
          let sumX = 0;
          let sumY = 0;
          pointPairs.forEach(point => {
            const [x, y] = point.split(',').map(Number);
            sumX += x;
            sumY += y;
          });
          rotationCenterX = sumX / pointPairs.length;
          rotationCenterY = sumY / pointPairs.length;
        }

        const transform = overhang.rotation
          ? `rotate(${overhang.rotation} ${rotationCenterX} ${rotationCenterY})`
          : undefined;

        // Polygon overhang (custom points) - highest priority
        if (shape === 'polygon' && overhang.points) {
          return (
            <Polygon
              key={index}
              points={overhang.points}
              fill={`url(#${PATTERN_ID})`}
              fillOpacity="0.8"
              stroke={OVERHANG_COLOR}
              strokeWidth="1"
              transform={transform}
            />
          );
        }

        // Triangle overhang
        if (shape === 'triangle') {
          if (!overhang.x || !overhang.y || !overhang.width || !overhang.height) {
            console.warn('Triangle overhang requires x, y, width, and height');
            return null;
          }

          let points: string;

          if (overhang.rightAngleCorner) {
            const { x, y, width, height } = overhang;
            switch (overhang.rightAngleCorner) {
              case 'bottom-left':
                points = [
                  `${x},${y}`,
                  `${x + width},${y}`,
                  `${x},${y - height}`,
                ].join(' ');
                break;
              case 'bottom-right':
                points = [
                  `${x},${y}`,
                  `${x - width},${y}`,
                  `${x},${y - height}`,
                ].join(' ');
                break;
              case 'top-left':
                points = [
                  `${x},${y}`,
                  `${x + width},${y}`,
                  `${x},${y + height}`,
                ].join(' ');
                break;
              case 'top-right':
                points = [
                  `${x},${y}`,
                  `${x - width},${y}`,
                  `${x},${y + height}`,
                ].join(' ');
                break;
            }
          } else {
            // Isosceles triangle
            const halfWidth = overhang.width / 2;
            points = [
              `${overhang.x},${overhang.y - overhang.height / 2}`,
              `${overhang.x - halfWidth},${overhang.y + overhang.height / 2}`,
              `${overhang.x + halfWidth},${overhang.y + overhang.height / 2}`,
            ].join(' ');
          }

          return (
            <Polygon
              key={index}
              points={points}
              fill={`url(#${PATTERN_ID})`}
              fillOpacity="0.8"
              stroke={OVERHANG_COLOR}
              strokeWidth="1"
              transform={transform}
            />
          );
        }

        // Rectangle overhang (default)
        if (!overhang.x || !overhang.y || !overhang.width || !overhang.height) {
          console.warn('Rectangle overhang requires x, y, width, and height');
          return null;
        }

        return (
          <Rect
            key={index}
            x={overhang.x}
            y={overhang.y}
            width={overhang.width}
            height={overhang.height}
            fill={`url(#${PATTERN_ID})`}
            fillOpacity="0.8"
            stroke={OVERHANG_COLOR}
            strokeWidth="1"
            transform={transform}
          />
        );
      })}
    </G>
  );
}

// ============================================================================
// TEXT LABEL RENDERING COMPONENT
// ============================================================================

/**
 * Renders text labels with background boxes that mask overhangs
 */
function TextLabels({ opacity }: { opacity?: number }) {
  return (
    <G opacity={opacity !== undefined ? opacity : 1}>
      {TEXT_LABELS.map((label, index) => {
        const fontSize = label.fontSize || 12;
        const fill = label.fill || '#FFFFFF';
        const padding = label.padding || 4;
        const backgroundColor = label.backgroundColor || '#000000';
        const bgOpacity = 0.7;

        // Estimate text width (rough approximation: ~0.6 * fontSize per character)
        const estimatedWidth = label.text.length * fontSize * 0.6;
        const boxWidth = estimatedWidth + padding * 2;
        const boxHeight = fontSize + padding * 2;

        const transform = label.rotation
          ? `rotate(${label.rotation} ${label.x} ${label.y})`
          : undefined;

        return (
          <G key={index} transform={transform}>
            {/* Background box that masks overhangs */}
            <Rect
              x={label.x - boxWidth / 2}
              y={label.y - boxHeight / 2}
              width={boxWidth}
              height={boxHeight}
              rx={2}
              fill={backgroundColor}
              fillOpacity={bgOpacity}
            />

            {/* Text label */}
            <SvgText
              x={label.x}
              y={label.y + fontSize / 3} // Adjust for text baseline
              fill={fill}
              fontSize={fontSize}
              textAnchor="middle"
              fontWeight="500"
            >
              {label.text}
            </SvgText>
          </G>
        );
      })}
    </G>
  );
}

// ============================================================================
// COMPASS COMPONENT
// ============================================================================

/**
 * Minimal compass indicator showing north pointing down
 */
function Compass() {
  const SIZE = 24;
  const X = VIEWBOX_CONFIG.maxX - SIZE - 5;
  const Y = -15;
  const CENTER_X = X + SIZE / 2;
  const CENTER_Y = Y + SIZE / 2;

  return (
    <G>
      {/* Simple arrow pointing down (north) */}
      <Polygon
        points={`${CENTER_X},${CENTER_Y + 6} ${CENTER_X - 3},${CENTER_Y - 2} ${CENTER_X + 3},${CENTER_Y - 2}`}
        fill="#EF4444"
      />

      {/* N label */}
      <SvgText
        x={CENTER_X}
        y={CENTER_Y + 12}
        fill="#EF4444"
        fontSize="8"
        fontWeight="bold"
        textAnchor="middle"
      >
        N
      </SvgText>
    </G>
  );
}

// ============================================================================
// ============================================================================
// DOT LAYER COMPONENT
// ============================================================================

/**
 * Renders dots on the map in viewBox coordinates.
 * Only rendered when zoomed (caller passes hasZoomed). Animates in with fade + scale pop.
 */
function DotLayer({ dots }: { dots: DotDefinition[] }) {
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.3)).current;
  const [opacity, setOpacity] = useState(0);
  const [scale, setScale] = useState(0.3);

  useEffect(() => {
    const opacityListener = opacityAnim.addListener(({ value }) => setOpacity(value));
    const scaleListener = scaleAnim.addListener(({ value }) => setScale(value));
    return () => {
      opacityAnim.removeListener(opacityListener);
      scaleAnim.removeListener(scaleListener);
    };
  }, [opacityAnim, scaleAnim]);

  useEffect(() => {
    if (!dots.length) return;
    opacityAnim.setValue(0);
    scaleAnim.setValue(0.3);
    Animated.parallel([
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 280,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 80,
        useNativeDriver: false,
      }),
    ]).start();
  }, [dots, opacityAnim, scaleAnim]);

  if (!dots.length) return null;

  const centerX = dots.reduce((s, d) => s + d.x, 0) / dots.length;
  const centerY = dots.reduce((s, d) => s + d.y, 0) / dots.length;
  const transform = `translate(${centerX}, ${centerY}) scale(${scale}) translate(${-centerX}, ${-centerY})`;

  return (
    <G opacity={opacity} transform={transform}>
      {dots.map((dot, index) => (
        <Circle
          key={index}
          cx={dot.x}
          cy={dot.y}
          r={dot.r ?? 4}
          fill={dot.fill ?? '#22C55E'}
          stroke={dot.stroke ?? '#FFFFFF'}
          strokeWidth={dot.strokeWidth ?? 2}
        />
      ))}
    </G>
  );
}

// ============================================================================
// LEGEND COMPONENT
// ============================================================================

export function Legend({ showWhenSelected = false }: { showWhenSelected?: boolean }) {
  // Hide legend when a wall is selected unless explicitly told to show
  if (!showWhenSelected) {
    return null;
  }

  return (
    <View className="flex-row justify-center items-center gap-6 mt-3">
      <View className="flex-row items-center gap-2">
        <View className="w-4 h-4 rounded-sm bg-[#1447E6]" />
        <Text className="text-gray-300 text-xs font-barlow">Rope</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <View className="w-4 h-4 rounded-sm bg-[#8200DB]" />
        <Text className="text-gray-300 text-xs font-barlow">Boulder</Text>
      </View>
      <View className="flex-row items-center gap-2">
        {/* Roof pattern preview using SVG */}
        <Svg width={16} height={16} viewBox="0 0 16 16">
          <Defs>
            <Pattern
              id="legend-overhang-pattern"
              patternUnits="userSpaceOnUse"
              width="8"
              height="8"
            >
              <SvgLine
                x1="0"
                y1="0"
                x2="8"
                y2="8"
                stroke="#4B5563"
                strokeWidth="2"
                opacity="0.6"
              />
            </Pattern>
          </Defs>
          <Rect
            x="0"
            y="0"
            width="16"
            height="16"
            fill="url(#legend-overhang-pattern)"
            fillOpacity="0.8"
            stroke="#4B5563"
            strokeWidth="1"
            rx="2"
          />
        </Svg>
        <Text className="text-gray-300 text-xs font-barlow">Roof</Text>
      </View>
    </View>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function TopDown({
  onData,
  initialSelection = null,
  onViewBoxChange,
  dots = [],
}: TopDownProps) {
  const [selectedPart, setSelectedPart] = useState<Locations | null>(
    initialSelection
  );

  // Track if the change is from props (to prevent infinite loop)
  const isUpdatingFromProps = useRef(false);
  const previousInitialSelection = useRef(initialSelection);

  // Animation values for viewBox
  const viewBoxMinXAnim = useRef(new Animated.Value(VIEWBOX_CONFIG.minX)).current;
  const viewBoxMinYAnim = useRef(new Animated.Value(VIEWBOX_CONFIG.minY)).current;
  const viewBoxWidthAnim = useRef(new Animated.Value(VIEWBOX_CONFIG.maxX - VIEWBOX_CONFIG.minX)).current;
  const viewBoxHeightAnim = useRef(new Animated.Value(VIEWBOX_CONFIG.maxY - VIEWBOX_CONFIG.minY)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // State to hold computed viewBox values (since SVG can't use Animated.Value directly)
  const [viewBoxMinX, setViewBoxMinX] = useState(VIEWBOX_CONFIG.minX);
  const [viewBoxMinY, setViewBoxMinY] = useState(VIEWBOX_CONFIG.minY);
  const [viewBoxWidth, setViewBoxWidth] = useState(VIEWBOX_CONFIG.maxX - VIEWBOX_CONFIG.minX);
  const [viewBoxHeight, setViewBoxHeight] = useState(VIEWBOX_CONFIG.maxY - VIEWBOX_CONFIG.minY);
  const [opacity, setOpacity] = useState(1);

  // Listeners to update state from animated values
  useEffect(() => {
    const minXListener = viewBoxMinXAnim.addListener(({ value }) => {
      setViewBoxMinX(value);
    });
    const minYListener = viewBoxMinYAnim.addListener(({ value }) => {
      setViewBoxMinY(value);
    });
    const widthListener = viewBoxWidthAnim.addListener(({ value }) => {
      setViewBoxWidth(value);
    });
    const heightListener = viewBoxHeightAnim.addListener(({ value }) => {
      setViewBoxHeight(value);
    });
    const opacityListener = opacityAnim.addListener(({ value }) => {
      setOpacity(value);
    });

    return () => {
      viewBoxMinXAnim.removeListener(minXListener);
      viewBoxMinYAnim.removeListener(minYListener);
      viewBoxWidthAnim.removeListener(widthListener);
      viewBoxHeightAnim.removeListener(heightListener);
      opacityAnim.removeListener(opacityListener);
    };
  }, [viewBoxMinXAnim, viewBoxMinYAnim, viewBoxWidthAnim, viewBoxHeightAnim, opacityAnim]);

  useEffect(() => {
    // Only update if initialSelection actually changed
    if (initialSelection !== previousInitialSelection.current) {
      isUpdatingFromProps.current = true;
      previousInitialSelection.current = initialSelection;
      setSelectedPart(initialSelection);
      // Reset flag in next tick after state update
      requestAnimationFrame(() => {
        isUpdatingFromProps.current = false;
      });
    }
  }, [initialSelection]);

  useEffect(() => {
    // Only call onData if the change came from user interaction, not from props
    if (!isUpdatingFromProps.current) {
      onData(selectedPart);
    }
  }, [selectedPart, onData]);

  // Animate viewBox to zoom in on selected wall
  useEffect(() => {
    if (selectedPart) {
      const definition = WALL_DEFINITIONS[selectedPart];
      const bounds = calculateWallBounds(definition);

      // Calculate zoom scale based on wall size (exclude ABWall from scaling)
      // Larger walls need less zoom, smaller walls need more zoom
      const wallWidth = bounds.maxX - bounds.minX;
      const wallHeight = bounds.maxY - bounds.minY;
      const wallDiagonal = Math.sqrt(wallWidth * wallWidth + wallHeight * wallHeight);
      const originalViewBoxWidth = VIEWBOX_CONFIG.maxX - VIEWBOX_CONFIG.minX;
      const originalViewBoxHeight = VIEWBOX_CONFIG.maxY - VIEWBOX_CONFIG.minY;
      const viewBoxDiagonal = Math.sqrt(
        originalViewBoxWidth ** 2 + originalViewBoxHeight ** 2
      );

      // Target scale: fill about 80% of viewBox for more zoom
      // Include ABWall in scaling so it gets centered and enlarged
      // ABWall gets less zoom (tighter) - use 0.5 fill instead of 0.8
      // Adjust fill percentage: ABWall and boulderSouth get less zoom (tighter)
      const isZoomTight = selectedPart === 'ABWall' || selectedPart === 'boulderSouth';
      const fillPercentage = isZoomTight ? 0.55 : 0.75;

      const targetScale = Math.min(5.0, (viewBoxDiagonal * fillPercentage) / wallDiagonal);

      // Calculate new viewBox dimensions (smaller = more zoomed)
      const newWidth = originalViewBoxWidth / targetScale;
      const newHeight = originalViewBoxHeight / targetScale;

      // Calculate new minX/minY to center viewBox on wall center
      // The viewBox window shifts to center on the selected wall (camera effect)
      // Note: The coordinate system origin remains at (0,0), only the viewport window changes
      // This ensures "upcoming visual routes" drawn at specific coordinates remain valid
      const targetCenterX = bounds.centerX;
      const targetCenterY = bounds.centerY;

      // Calculate new viewBox origin to center on target
      const newMinX = targetCenterX - newWidth / 2;
      const newMinY = targetCenterY - newHeight / 2;

      // Clamp to original bounds to prevent viewing outside the map
      const clampedMinX = Math.max(VIEWBOX_CONFIG.minX, Math.min(newMinX, VIEWBOX_CONFIG.maxX - newWidth));
      const clampedMinY = Math.max(VIEWBOX_CONFIG.minY, Math.min(newMinY, VIEWBOX_CONFIG.maxY - newHeight));

      // Animate viewBox zoom and fade non-selected walls
      Animated.parallel([
        Animated.timing(viewBoxMinXAnim, {
          toValue: clampedMinX,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(viewBoxMinYAnim, {
          toValue: clampedMinY,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(viewBoxWidthAnim, {
          toValue: newWidth,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(viewBoxHeightAnim, {
          toValue: newHeight,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0.2, // Fade non-selected walls significantly to create focus effect
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    } else {
      // Animate back to original viewBox and show all walls
      Animated.parallel([
        Animated.timing(viewBoxMinXAnim, {
          toValue: VIEWBOX_CONFIG.minX,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(viewBoxMinYAnim, {
          toValue: VIEWBOX_CONFIG.minY,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(viewBoxWidthAnim, {
          toValue: VIEWBOX_CONFIG.maxX - VIEWBOX_CONFIG.minX,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(viewBoxHeightAnim, {
          toValue: VIEWBOX_CONFIG.maxY - VIEWBOX_CONFIG.minY,
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1, // Show all walls
          duration: 400,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: false,
        }),
      ]).start();
    }
  }, [selectedPart, viewBoxMinXAnim, viewBoxMinYAnim, viewBoxWidthAnim, viewBoxHeightAnim, opacityAnim]);

  // Build animated viewBox string
  const viewBox = `${viewBoxMinX} ${viewBoxMinY} ${viewBoxWidth} ${viewBoxHeight}`;

  // Notify parent of viewBox changes
  useEffect(() => {
    if (onViewBoxChange) {
      onViewBoxChange({
        minX: viewBoxMinX,
        minY: viewBoxMinY,
        width: viewBoxWidth,
        height: viewBoxHeight,
      });
    }
  }, [viewBoxMinX, viewBoxMinY, viewBoxWidth, viewBoxHeight, onViewBoxChange]);

  // Helper function to format wall name for display
  const formatWallName = (location: Locations | null): string => {
    if (!location) return 'None';
    return location
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  };

  return (
    <View className="items-center justify-center relative w-full">
      {/* Wall name label - appears when wall is selected, positioned in top left */}
      {/* {selectedPart && (
        <View className="absolute top-0 left-0 z-20 m-2">
          <View className="bg-black/80 border border-gray-500 rounded-lg px-3 py-2">
            <Text className="text-white text-sm font-barlow-700">
              {formatWallName(selectedPart)}
            </Text>
          </View>
        </View>
      )} */}

      <View
        className="w-full  rounded-lg overflow-hidden"
        style={{ aspectRatio: VIEWBOX_CONFIG.displayWidth / VIEWBOX_CONFIG.displayHeight }}
      >
        <Svg
          viewBox={viewBox}
          width="100%"
          height="100%"
          preserveAspectRatio="xMidYMid meet"
        >
          {/* Render overhangs first (underneath walls) - keep visible when wall is selected */}
          <OverhangLayer opacity={1} />

          {/* Text labels with background boxes (masks overhangs) - hide when wall is selected */}
          {!selectedPart && <TextLabels opacity={1} />}

          {/* Render all walls from configuration */}
          {(Object.keys(WALL_DEFINITIONS) as Locations[]).map((location) => {
            return (
              <WallSection
                key={location}
                location={location}
                definition={WALL_DEFINITIONS[location]}
                selectedPart={selectedPart}
                setSelectedPart={setSelectedPart}
                opacity={opacity}
              />
            );
          })}

          {/* Compass indicator */}
          <Compass />

          {/* Dots only when zoomed; fade-in + scale pop */}
          {selectedPart && dots.length > 0 && <DotLayer dots={dots} />}
        </Svg>
      </View>
    </View>
  );
}
