import { Button } from '@/design-system';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import type { SharedStemPair } from './crossStaffHelpers';
import {
  isSharedStem,
  setSharedStem,
  sharedStemProblem,
} from './crossStaffHelpers';
import type { CompositionStructure } from './types';

interface SharedStemInputProps {
  pair: SharedStemPair;
  structure: CompositionStructure;
}

export function SharedStemInput({ pair, structure }: SharedStemInputProps) {
  const { editStructure } = useCompositionFormSession();
  const joined = isSharedStem(structure, pair);
  const problem = joined ? null : sharedStemProblem(structure, pair);

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-sm text-zinc-500">
        {joined
          ? 'Both hands share one stem here.'
          : 'Join these two notes with one stem across the staves.'}
      </div>
      {problem && <div className="text-xs text-zinc-400">{problem}</div>}
      <Button
        type="button"
        variant={joined ? 'secondary' : undefined}
        disabled={problem !== null}
        onClick={() => editStructure((s) => setSharedStem(s, pair, !joined))}
      >
        {joined ? 'Separate stems' : 'Share one stem'}
      </Button>
    </div>
  );
}
