import type { TieValue } from '../types/elements';
import { tiedInto, tiesOn } from './tieRules';

describe('tie roles', () => {
  const ties: (TieValue | null)[] = [
    'start',
    'continue',
    'end',
    'laissez-vibrer',
    null,
  ];

  it('reads continue as both ends of a chain', () => {
    expect(ties.map((tie) => tiesOn(tie))).toEqual([
      true,
      true,
      false,
      false,
      false,
    ]);
    expect(ties.map((tie) => tiedInto(tie))).toEqual([
      false,
      true,
      true,
      false,
      false,
    ]);
  });
});
