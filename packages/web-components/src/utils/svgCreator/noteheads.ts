import type { NoteheadGlyph } from '../../rules/noteheadRules';
import { SVG_NS } from '../consts';
import {
  CIRCLE_X_HEAD_HEIGHT_PX,
  DIAMOND_HEAD_HEIGHT_PX,
  TRIANGLE_HEAD_HEIGHT_PX,
  X_HEAD_HEIGHT_PX,
} from '../notationDimensions';

// Outlines are in staff-space units, bbox-min origin, y-down. Stem anchors
// sit on the outline's side extremes: the NE / SW arm tips of a cross, the
// side corners of a diamond.
const NOTEHEAD_X_BLACK_PATH_D =
  'M 1.14 0.896 L 0.664 0.5 L 1.14 0.1 C 1.152 0.092 1.16 0.072 1.16 0.056 C 1.16 0.024 1.132 0 1.108 0 C 1.1 0 1.088 0.004 1.08 0.008 L 0.576 0.428 L 0.08 0.008 C 0.072 0.004 0.06 0 0.048 0 C 0.02 0 0 0.028 0 0.052 C 0 0.068 0.008 0.088 0.02 0.1 L 0.496 0.5 L 0.02 0.896 C 0.004 0.908 0 0.924 0 0.94 C 0 0.972 0.02 1 0.052 1 C 0.064 1 0.072 0.996 0.08 0.988 L 0.576 0.568 L 1.08 0.988 C 1.088 0.996 1.1 1 1.108 1 C 1.14 1 1.16 0.968 1.16 0.944 C 1.16 0.924 1.152 0.908 1.14 0.896';
const NOTEHEAD_X_BLACK_NATURAL_WIDTH = 1.16;
const NOTEHEAD_X_BLACK_NATURAL_HEIGHT = 1;
const NOTEHEAD_X_BLACK_STEM_UP_ANCHOR = { x: 1.16, y: 0.056 };
const NOTEHEAD_X_BLACK_STEM_DOWN_ANCHOR = { x: 0, y: 0.94 };

const NOTEHEAD_CIRCLE_X_PATH_D =
  'M 0.496 0 C 0.224 0 0 0.224 0 0.5 C 0 0.776 0.224 1 0.496 1 C 0.772 1 0.996 0.776 0.996 0.5 C 0.996 0.224 0.772 0 0.496 0 M 0.724 0.188 L 0.5 0.416 L 0.272 0.188 C 0.336 0.144 0.412 0.116 0.496 0.116 C 0.584 0.116 0.66 0.144 0.724 0.188 M 0.88 0.5 C 0.88 0.584 0.856 0.664 0.812 0.728 L 0.58 0.496 L 0.808 0.268 C 0.852 0.332 0.88 0.416 0.88 0.5 M 0.112 0.5 C 0.112 0.412 0.14 0.332 0.192 0.268 L 0.42 0.496 L 0.188 0.732 C 0.136 0.668 0.112 0.584 0.112 0.5 M 0.264 0.808 L 0.5 0.576 L 0.728 0.808 C 0.664 0.856 0.584 0.884 0.496 0.884 C 0.412 0.884 0.332 0.856 0.264 0.808';
const NOTEHEAD_CIRCLE_X_NATURAL_WIDTH = 0.996;
const NOTEHEAD_CIRCLE_X_NATURAL_HEIGHT = 1;
const NOTEHEAD_CIRCLE_X_STEM_UP_ANCHOR = { x: 0.996, y: 0.5 };
const NOTEHEAD_CIRCLE_X_STEM_DOWN_ANCHOR = { x: 0, y: 0.5 };

const NOTEHEAD_DIAMOND_WHOLE_PATH_D =
  'M 1.072 0.564 C 1.076 0.556 1.08 0.552 1.08 0.544 C 1.08 0.536 1.072 0.524 1.064 0.52 L 0.36 0.004 C 0.356 0 0.348 0 0.34 0 C 0.332 0 0.324 0 0.32 0.008 L 0.008 0.436 C 0.004 0.444 0 0.448 0 0.452 C 0 0.456 0.008 0.472 0.012 0.48 L 0.716 0.996 C 0.724 0.996 0.728 1 0.732 1 C 0.744 1 0.752 0.996 0.756 0.988 M 0.184 0.388 C 0.18 0.384 0.172 0.376 0.172 0.368 L 0.304 0.192 C 0.304 0.188 0.308 0.188 0.312 0.188 C 0.32 0.188 0.324 0.192 0.328 0.192 L 0.888 0.604 C 0.896 0.608 0.9 0.616 0.9 0.628 C 0.772 0.808 0.768 0.808 0.764 0.808 C 0.756 0.808 0.752 0.804 0.744 0.8';
const NOTEHEAD_DIAMOND_WHOLE_NATURAL_WIDTH = 1.08;
const NOTEHEAD_DIAMOND_WHOLE_NATURAL_HEIGHT = 1;
const NOTEHEAD_DIAMOND_WHOLE_STEM_UP_ANCHOR = { x: 1.08, y: 0.544 };
const NOTEHEAD_DIAMOND_WHOLE_STEM_DOWN_ANCHOR = { x: 0, y: 0.452 };

const NOTEHEAD_DIAMOND_HALF_WIDE_PATH_D =
  'M 1.396 0.524 C 1.4 0.52 1.404 0.512 1.404 0.504 C 1.404 0.496 1.4 0.492 1.396 0.484 L 0.728 0.008 C 0.724 0.004 0.712 0 0.7 0 C 0.692 0 0.68 0.004 0.676 0.008 L 0.016 0.484 C 0.004 0.492 0 0.496 0 0.504 C 0 0.512 0.004 0.516 0.016 0.524 L 0.672 0.992 C 0.68 0.996 0.692 1 0.7 1 C 0.712 1 0.724 0.996 0.732 0.992 M 1.036 0.432 C 1.036 0.552 0.648 0.7 0.536 0.7 C 0.472 0.7 0.416 0.684 0.376 0.636 C 0.352 0.616 0.34 0.592 0.34 0.572 C 0.34 0.456 0.716 0.3 0.828 0.3 C 0.892 0.3 1.036 0.352 1.036 0.432';
const NOTEHEAD_DIAMOND_HALF_WIDE_NATURAL_WIDTH = 1.404;
const NOTEHEAD_DIAMOND_HALF_WIDE_NATURAL_HEIGHT = 1;
const NOTEHEAD_DIAMOND_HALF_WIDE_STEM_UP_ANCHOR = { x: 1.404, y: 0.504 };
const NOTEHEAD_DIAMOND_HALF_WIDE_STEM_DOWN_ANCHOR = { x: 0, y: 0.504 };

const NOTEHEAD_DIAMOND_BLACK_PATH_D =
  'M 0.992 0.516 C 0.996 0.512 1 0.504 1 0.496 C 1 0.488 0.996 0.48 0.992 0.476 L 0.524 0.008 C 0.52 0.004 0.512 0 0.5 0 C 0.492 0 0.48 0.004 0.476 0.008 L 0.008 0.476 C 0 0.484 0 0.488 0 0.496 C 0 0.504 0.004 0.512 0.012 0.52 L 0.48 0.992 C 0.488 1 0.492 1 0.5 1 C 0.504 1 0.512 1 0.52 0.992';
const NOTEHEAD_DIAMOND_BLACK_NATURAL_WIDTH = 1;
const NOTEHEAD_DIAMOND_BLACK_NATURAL_HEIGHT = 1;
const NOTEHEAD_DIAMOND_BLACK_STEM_UP_ANCHOR = { x: 1, y: 0.496 };
const NOTEHEAD_DIAMOND_BLACK_STEM_DOWN_ANCHOR = { x: 0, y: 0.496 };

const NOTEHEAD_TRIANGLE_UP_WHITE_PATH_D =
  'M 1.172 1 L 0.58 0 L 0 1 M 0.196 0.888 L 0.58 0.224 L 0.972 0.888';
const NOTEHEAD_TRIANGLE_UP_WHITE_NATURAL_WIDTH = 1.172;
const NOTEHEAD_TRIANGLE_UP_WHITE_NATURAL_HEIGHT = 1;

const NOTEHEAD_TRIANGLE_UP_BLACK_PATH_D = 'M 1.172 1 L 0.576 0 L 0 1';
const NOTEHEAD_TRIANGLE_UP_BLACK_NATURAL_WIDTH = 1.172;
const NOTEHEAD_TRIANGLE_UP_BLACK_NATURAL_HEIGHT = 1;

const NOTEHEAD_TRIANGLE_DOWN_WHITE_PATH_D =
  'M 0.58 1 L 1.172 0 L 0 0 M 0.58 0.776 L 0.196 0.112 L 0.972 0.112';
const NOTEHEAD_TRIANGLE_DOWN_WHITE_NATURAL_WIDTH = 1.172;
const NOTEHEAD_TRIANGLE_DOWN_WHITE_NATURAL_HEIGHT = 1;

const NOTEHEAD_TRIANGLE_DOWN_BLACK_PATH_D = 'M 0.576 1 L 1.168 0 L 0 0';
const NOTEHEAD_TRIANGLE_DOWN_BLACK_NATURAL_WIDTH = 1.168;
const NOTEHEAD_TRIANGLE_DOWN_BLACK_NATURAL_HEIGHT = 1;

type Point = { x: number; y: number };

type GlyphOutline = {
  pathD: string;
  width: number;
  height: number;
  heightPx: number;
  stemUpAnchor: Point;
  stemDownAnchor: Point;
  // The stem joins at the anchor's own x (the centre of a triangle's base)
  // rather than with the stem's outer edge flush against the head's side.
  centredAnchor: boolean;
};

// A triangle's stem joins the centre of its base, whichever way it points.
const triangleOutline = (
  pathD: string,
  width: number,
  height: number,
  pointsUp: boolean
): GlyphOutline => {
  const base = { x: width / 2, y: pointsUp ? height : 0 };
  return {
    pathD,
    width,
    height,
    heightPx: TRIANGLE_HEAD_HEIGHT_PX,
    stemUpAnchor: base,
    stemDownAnchor: base,
    centredAnchor: true,
  };
};

const GLYPHS: Record<NoteheadGlyph, GlyphOutline> = {
  x: {
    pathD: NOTEHEAD_X_BLACK_PATH_D,
    width: NOTEHEAD_X_BLACK_NATURAL_WIDTH,
    height: NOTEHEAD_X_BLACK_NATURAL_HEIGHT,
    heightPx: X_HEAD_HEIGHT_PX,
    stemUpAnchor: NOTEHEAD_X_BLACK_STEM_UP_ANCHOR,
    stemDownAnchor: NOTEHEAD_X_BLACK_STEM_DOWN_ANCHOR,
    centredAnchor: false,
  },
  'circle-x': {
    pathD: NOTEHEAD_CIRCLE_X_PATH_D,
    width: NOTEHEAD_CIRCLE_X_NATURAL_WIDTH,
    height: NOTEHEAD_CIRCLE_X_NATURAL_HEIGHT,
    heightPx: CIRCLE_X_HEAD_HEIGHT_PX,
    stemUpAnchor: NOTEHEAD_CIRCLE_X_STEM_UP_ANCHOR,
    stemDownAnchor: NOTEHEAD_CIRCLE_X_STEM_DOWN_ANCHOR,
    centredAnchor: false,
  },
  'diamond-black': {
    pathD: NOTEHEAD_DIAMOND_BLACK_PATH_D,
    width: NOTEHEAD_DIAMOND_BLACK_NATURAL_WIDTH,
    height: NOTEHEAD_DIAMOND_BLACK_NATURAL_HEIGHT,
    heightPx: DIAMOND_HEAD_HEIGHT_PX,
    stemUpAnchor: NOTEHEAD_DIAMOND_BLACK_STEM_UP_ANCHOR,
    stemDownAnchor: NOTEHEAD_DIAMOND_BLACK_STEM_DOWN_ANCHOR,
    centredAnchor: false,
  },
  'diamond-white': {
    pathD: NOTEHEAD_DIAMOND_WHOLE_PATH_D,
    width: NOTEHEAD_DIAMOND_WHOLE_NATURAL_WIDTH,
    height: NOTEHEAD_DIAMOND_WHOLE_NATURAL_HEIGHT,
    heightPx: DIAMOND_HEAD_HEIGHT_PX,
    stemUpAnchor: NOTEHEAD_DIAMOND_WHOLE_STEM_UP_ANCHOR,
    stemDownAnchor: NOTEHEAD_DIAMOND_WHOLE_STEM_DOWN_ANCHOR,
    centredAnchor: false,
  },
  'diamond-white-wide': {
    pathD: NOTEHEAD_DIAMOND_HALF_WIDE_PATH_D,
    width: NOTEHEAD_DIAMOND_HALF_WIDE_NATURAL_WIDTH,
    height: NOTEHEAD_DIAMOND_HALF_WIDE_NATURAL_HEIGHT,
    heightPx: DIAMOND_HEAD_HEIGHT_PX,
    stemUpAnchor: NOTEHEAD_DIAMOND_HALF_WIDE_STEM_UP_ANCHOR,
    stemDownAnchor: NOTEHEAD_DIAMOND_HALF_WIDE_STEM_DOWN_ANCHOR,
    centredAnchor: false,
  },
  'triangle-up-black': triangleOutline(
    NOTEHEAD_TRIANGLE_UP_BLACK_PATH_D,
    NOTEHEAD_TRIANGLE_UP_BLACK_NATURAL_WIDTH,
    NOTEHEAD_TRIANGLE_UP_BLACK_NATURAL_HEIGHT,
    true
  ),
  'triangle-up-white': triangleOutline(
    NOTEHEAD_TRIANGLE_UP_WHITE_PATH_D,
    NOTEHEAD_TRIANGLE_UP_WHITE_NATURAL_WIDTH,
    NOTEHEAD_TRIANGLE_UP_WHITE_NATURAL_HEIGHT,
    true
  ),
  'triangle-down-black': triangleOutline(
    NOTEHEAD_TRIANGLE_DOWN_BLACK_PATH_D,
    NOTEHEAD_TRIANGLE_DOWN_BLACK_NATURAL_WIDTH,
    NOTEHEAD_TRIANGLE_DOWN_BLACK_NATURAL_HEIGHT,
    false
  ),
  'triangle-down-white': triangleOutline(
    NOTEHEAD_TRIANGLE_DOWN_WHITE_PATH_D,
    NOTEHEAD_TRIANGLE_DOWN_WHITE_NATURAL_WIDTH,
    NOTEHEAD_TRIANGLE_DOWN_WHITE_NATURAL_HEIGHT,
    false
  ),
};

// Where a glyph head sits in the caller's coordinate space. The stem column
// never moves; the glyph is translated so its anchor lands on the stem. A
// stemless head (centreX given) is centred there instead.
export type NoteheadPlacement = {
  cx: number;
  cy: number;
  halfWidth: number;
  halfHeight: number;
  // Y at which the stem meets the head.
  anchorY: number;
  originX: number;
  originY: number;
  scale: number;
};

export function placeNoteheadGlyph({
  glyph,
  stemUp,
  stemX,
  stemWidth,
  cy,
  unitsPerPx,
  centreX,
}: {
  glyph: NoteheadGlyph;
  stemUp: boolean;
  stemX: number;
  stemWidth: number;
  cy: number;
  unitsPerPx: number;
  centreX?: number;
}): NoteheadPlacement {
  const outline = GLYPHS[glyph];
  const scale = (outline.heightPx * unitsPerPx) / outline.height;
  const anchor = stemUp ? outline.stemUpAnchor : outline.stemDownAnchor;
  const anchorTargetX = outline.centredAnchor
    ? stemX
    : stemX + ((stemUp ? 1 : -1) * stemWidth) / 2;
  const originX =
    centreX !== undefined
      ? centreX - (outline.width / 2) * scale
      : anchorTargetX - anchor.x * scale;
  const originY = cy - (outline.height / 2) * scale;
  return {
    cx: originX + (outline.width / 2) * scale,
    cy,
    halfWidth: (outline.width / 2) * scale,
    halfHeight: (outline.height / 2) * scale,
    anchorY: originY + anchor.y * scale,
    originX,
    originY,
    scale,
  };
}

export function createNoteheadGlyphPath(
  glyph: NoteheadGlyph,
  placement: NoteheadPlacement
): SVGPathElement {
  const path = document.createElementNS(SVG_NS, 'path');
  path.dataset.notehead = glyph;
  path.setAttribute('d', GLYPHS[glyph].pathD);
  path.setAttribute(
    'transform',
    `translate(${placement.originX} ${placement.originY}) scale(${placement.scale})`
  );
  path.setAttribute('fill', 'currentColor');
  path.setAttribute('stroke', 'none');
  return path;
}
