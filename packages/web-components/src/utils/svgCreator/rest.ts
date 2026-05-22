import { DurationType } from '../../types/theory';
import { SVG_NS } from '../consts';
import {
  COORD_WIDTH,
  NOTE_SCALE,
  NOTE_SVG_HEIGHT,
  NOTE_SVG_WIDTH,
} from './note';

// Vertical centre of the rest SVG in pixels — used as yHeadOffset so the staff
// positions the rest symbol centred on the target staff Y coordinate.
export const REST_Y_SVG_CENTER = NOTE_SVG_HEIGHT / 2;

// All geometry is expressed in the same 600-unit coordinate space as note.ts,
// scaled to the 32×60px viewport via scale(NOTE_SCALE).

// One staff-line-space in 600-unit coords: STAFF_LINE_SPACING(10px) / NOTE_SCALE
const SPACE = 10 / NOTE_SCALE; // ≈187.5 units

// Centre of the 600-unit horizontal axis
const X_CENTER = COORD_WIDTH / 2; // 300

// Y coordinate of the SVG vertical centre in 600-unit coords
const Y_CENTER = REST_Y_SVG_CENTER / NOTE_SCALE; // 30 / NOTE_SCALE = 562.5

// Whole/half rest rectangle: width = one notehead width (160 units), height = ½ space (≈94 units)
const REST_RECT_WIDTH = 160;
const REST_RECT_HEIGHT = Math.round(SPACE * 0.5); // ≈94

// Whole rest: hangs below the 2nd staff line from top.
// The 2nd line is one space above centre → Y_CENTER - SPACE / 2.
// The rectangle hangs down from that line, so its top edge is at the line.
const WHOLE_REST_Y = Math.round(Y_CENTER - SPACE / 2);

// Half rest: sits on top of the centre staff line.
// The centre line is at Y_CENTER. The rectangle sits above it, so its bottom edge is at the line.
const HALF_REST_Y = Math.round(Y_CENTER - REST_RECT_HEIGHT);

export type RestProps = {
  duration: DurationType;
};
export const createRestSvg = ({
  duration,
}: RestProps): [SVGSVGElement, number] => {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('xmlns', SVG_NS);
  svg.classList.add('rest');
  svg.dataset.duration = duration;
  svg.setAttribute('width', `${NOTE_SVG_WIDTH}`);
  svg.setAttribute('height', `${NOTE_SVG_HEIGHT}`);
  svg.setAttribute('overflow', 'visible');

  const g = document.createElementNS(SVG_NS, 'g');
  g.setAttribute('transform', `scale(${NOTE_SCALE})`);

  if (duration === 'whole') {
    g.appendChild(createRect(WHOLE_REST_Y));
  } else if (duration === 'half') {
    g.appendChild(createRect(HALF_REST_Y));
  } else if (duration === 'quarter') {
    g.appendChild(createQuarterRestPath());
  } else {
    g.appendChild(createHookedRest(duration));
  }

  svg.appendChild(g);

  return [svg, REST_Y_SVG_CENTER];
};

function createRect(y: number): SVGRectElement {
  const rect = document.createElementNS(SVG_NS, 'rect');
  rect.setAttribute('x', String(Math.round(X_CENTER - REST_RECT_WIDTH / 2)));
  rect.setAttribute('y', String(y));
  rect.setAttribute('width', String(REST_RECT_WIDTH));
  rect.setAttribute('height', String(REST_RECT_HEIGHT));
  rect.setAttribute('fill', 'currentColor');
  return rect;
}

function createQuarterRestPath(): SVGPathElement {
  const path = document.createElementNS(SVG_NS, 'path');
  const top = Y_CENTER - SPACE * 2;
  const bottom = Y_CENTER + SPACE * 2;
  const S = (bottom - top) / 296;
  const sx = X_CENTER + 42.3 * S;
  const sy = top + 75 * S;

  path.setAttribute(
    'd',
    `M${sx},${sy}
     C${sx + 0 * S},${sy + 18.812 * S}
       ${sx - 37.624 * S},${sy + 47.03 * S}
       ${sx - 37.624 * S},${sy + 84.655 * S}
     C${sx - 37.624 * S},${sy + 98.764 * S}
       ${sx - 9.406 * S},${sy + 141.091 * S}
       ${sx + 9.406 * S},${sy + 164.607 * S}
     C${sx + 0 * S},${sy + 159.904 * S}
       ${sx - 9.406 * S},${sy + 155.201 * S}
       ${sx - 23.515 * S},${sy + 155.201 * S}
     C${sx - 51.733 * S},${sy + 155.201 * S}
       ${sx - 61.139 * S},${sy + 178.716 * S}
       ${sx - 61.139 * S},${sy + 192.825 * S}
     C${sx - 61.139 * S},${sy + 202.231 * S}
       ${sx - 51.733 * S},${sy + 211.637 * S}
       ${sx - 47.03 * S},${sy + 221.043 * S}
     C${sx - 75.248 * S},${sy + 202.231 * S}
       ${sx - 94.06 * S},${sy + 183.419 * S}
       ${sx - 94.06 * S},${sy + 164.607 * S}
     C${sx - 94.06 * S},${sy + 117.577 * S}
       ${sx - 61.938 * S},${sy + 134.037 * S}
       ${sx - 38.423 * S},${sy + 124.631 * S}
     C${sx - 61.938 * S},${sy + 101.116 * S}
       ${sx - 84.654 * S},${sy + 65.843 * S}
       ${sx - 84.654 * S},${sy + 51.734 * S}
     C${sx - 84.654 * S},${sy + 42.328 * S}
       ${sx - 56.436 * S},${sy + 9.407 * S}
       ${sx - 47.03 * S},${sy - 14.108 * S}
     L${sx - 47.03 * S},${sy - 28.217 * S}
     C${sx - 47.03 * S},${sy - 42.326 * S}
       ${sx - 56.436 * S},${sy - 61.138 * S}
       ${sx - 61.139 * S},${sy - 75.247 * S}
     C${sx - 42.327 * S},${sy - 51.732 * S}
       ${sx + 0 * S},${sy - 9.404 * S}
       ${sx + 0 * S},${sy + 0.002 * S}
     Z`
  );
  path.setAttribute('fill', 'currentColor');
  return path;
}

const STEM_ANGLE_X = 60;
const STEM_STROKE_WIDTH = 40;
const HOOK_SPACING = SPACE * 0.85;

const hookCountMap: Partial<Record<DurationType, number>> = {
  eighth: 1,
  sixteenth: 2,
  thirtysecond: 3,
  sixtyfourth: 4,
  hundredtwentyeighth: 5,
};

function createHookedRest(duration: DurationType): SVGGElement {
  const hookCount = hookCountMap[duration] ?? 1;
  const group = document.createElementNS(SVG_NS, 'g');

  // Stem: angled line, top-right to bottom-left, grows longer with more hooks
  const stemTopX = X_CENTER + 40;
  const stemTopY = Y_CENTER - SPACE * 0.5 - (hookCount - 1) * SPACE * 0.5;
  const stemBotX = stemTopX - STEM_ANGLE_X;
  const stemBotY = Y_CENTER + SPACE * 1.0 + (hookCount - 1) * SPACE * 0.65;

  const stem = document.createElementNS(SVG_NS, 'line');
  stem.setAttribute('x1', stemTopX.toString());
  stem.setAttribute('y1', stemTopY.toString());
  stem.setAttribute('x2', stemBotX.toString());
  stem.setAttribute('y2', stemBotY.toString());
  stem.setAttribute('stroke', 'currentColor');
  stem.setAttribute('stroke-width', STEM_STROKE_WIDTH.toString());
  stem.setAttribute('stroke-linecap', 'round');
  group.appendChild(stem);

  // Hook: large ball on the left end of a curved arm extending from the stem.
  // Additional hooks for shorter durations are stacked below via <use>.
  const hookId = 'rest-hook';
  const hx = stemTopX - 10;
  const hy = stemTopY + SPACE * 0.05;

  const ballCx = hx - SPACE * 1;
  const ballR = SPACE * 0.25;
  const armEndY = hy + SPACE * 0.5;
  const ballCy = armEndY - ballR * 0.7;

  const hookGroup = document.createElementNS(SVG_NS, 'g');
  hookGroup.setAttribute('id', hookId);

  const ball = document.createElementNS(SVG_NS, 'circle');
  ball.setAttribute('cx', ballCx.toString());
  ball.setAttribute('cy', ballCy.toString());
  ball.setAttribute('r', ballR.toString());
  ball.setAttribute('fill', 'currentColor');
  hookGroup.appendChild(ball);

  // Arm curves from stem attachment leftward to just above ball center.
  // Slight upward arc on the control points creates the concave notch at the top.
  const arm = document.createElementNS(SVG_NS, 'path');
  arm.setAttribute(
    'd',
    `M${hx},${hy + SPACE * 0.05}
     C${hx - SPACE * 0.3},${hy + SPACE * 0.55}
       ${hx - SPACE * 0.9},${hy + SPACE * 0.55}
       ${ballCx},${armEndY}`
  );
  arm.setAttribute('stroke', 'currentColor');
  arm.setAttribute('stroke-width', (SPACE * 0.15).toString());
  arm.setAttribute('stroke-linecap', 'round');
  arm.setAttribute('fill', 'none');
  hookGroup.appendChild(arm);

  group.appendChild(hookGroup);

  for (let i = 1; i < hookCount; i++) {
    const hookCopy = document.createElementNS(SVG_NS, 'use');
    hookCopy.setAttribute('href', `#${hookId}`);
    hookCopy.setAttribute('y', (HOOK_SPACING * i).toString());
    group.appendChild(hookCopy);
  }

  return group;
}
