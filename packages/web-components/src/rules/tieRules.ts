import type { TieValue } from '../types/elements';

/** Whether a `tie` value ties on to the next entry. */
export const tiesOn = (tie: TieValue | null | undefined): boolean =>
  tie === 'start' || tie === 'continue';

/** Whether a `tie` value is tied into from the previous entry. */
export const tiedInto = (tie: TieValue | null | undefined): boolean =>
  tie === 'end' || tie === 'continue';
