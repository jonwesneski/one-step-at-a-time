import { augmentationDotCentersX } from '../../rules/augmentationDotRules';
import { SVG_NS } from '../consts';
import {
  AUGMENTATION_DOT_DIAMETER_PX,
  STAFF_LINE_SPACING,
} from '../notationDimensions';

// Dot outline in stave-space units, top-left at the origin.
const AUGMENTATION_DOT_PATH_D =
  'M 0.4 0.2 C 0.4 0.088 0.312 0 0.2 0 C 0.088 0 0 0.088 0 0.2 C 0 0.312 0.088 0.4 0.2 0.4 C 0.312 0.4 0.4 0.312 0.4 0.2';

export type AugmentationDotsProps = {
  dotCount: number;
  // Left ink edge (px) of the first dot in each row.
  leftX: number;
  // Centre y (px) of each row: one row per dotted stave space.
  rowCentersY: readonly number[];
};

/** A `.augmentation-dots` group in the caller's px space, or null for no dots. */
export function createAugmentationDotsSvg({
  dotCount,
  leftX,
  rowCentersY,
}: AugmentationDotsProps): SVGGElement | null {
  if (dotCount === 0 || rowCentersY.length === 0) {
    return null;
  }
  const group = document.createElementNS(SVG_NS, 'g');
  group.classList.add('augmentation-dots');
  const radius = AUGMENTATION_DOT_DIAMETER_PX / 2;
  for (const centerY of rowCentersY) {
    for (const centerX of augmentationDotCentersX(leftX, dotCount)) {
      const dot = document.createElementNS(SVG_NS, 'path');
      dot.classList.add('augmentation-dot');
      dot.setAttribute('d', AUGMENTATION_DOT_PATH_D);
      dot.setAttribute(
        'transform',
        `translate(${centerX - radius} ${
          centerY - radius
        }) scale(${STAFF_LINE_SPACING})`
      );
      dot.setAttribute('fill', 'currentColor');
      group.appendChild(dot);
    }
  }
  return group;
}
