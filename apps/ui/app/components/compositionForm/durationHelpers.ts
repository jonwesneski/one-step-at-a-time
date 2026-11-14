import type { DurationType } from '@one-step-at-a-time/web-components';
import {
  DURATIONS,
  durationToFactor,
} from '@one-step-at-a-time/web-components';
import { CAPACITY_EPSILON } from './measureCapacityHelpers';

// Writes a length as the fewest durations, longest first: a single dotted value
// where one fits exactly (0.375 → dotted-quarter), else a tie chain (the 0.3125
// a barline can leave → quarter + sixteenth). Greedy over `DURATIONS`, which is
// sorted longest first — every time signature here has a power-of-two beat
// type, so a factor that is a multiple of a 128th always resolves exactly.
export function decomposeToDurations(factor: number): DurationType[] {
  const out: DurationType[] = [];
  let remaining = factor;
  for (const duration of DURATIONS) {
    const size = durationToFactor[duration];
    while (remaining + CAPACITY_EPSILON >= size) {
      out.push(duration);
      remaining -= size;
    }
    if (remaining <= CAPACITY_EPSILON) {
      break;
    }
  }
  return out;
}
