import { DurationType } from '../types/theory';
import { MIDDLE_STAFF_Y, STAFF_Y_PADDING } from '../utils/notationDimensions';
import { getRestVisualCenterOffset, REST_Y_SVG_CENTER } from '../utils/svgCreator/rest';

const durations: DurationType[] = [
  'whole',
  'half',
  'quarter',
  'eighth',
  'sixteenth',
  'thirtysecond',
  'sixtyfourth',
  'hundredtwentyeighth',
];

const restTopMap: Record<DurationType, number> = Object.fromEntries(
  durations.map((d) => {
    const yCoordinate = MIDDLE_STAFF_Y - getRestVisualCenterOffset(d);
    return [d, STAFF_Y_PADDING + yCoordinate - REST_Y_SVG_CENTER];
  })
) as Record<DurationType, number>;

export function restToYCoordinate(duration: DurationType): number {
  return restTopMap[duration];
}
