import { Radio } from '@/design-system';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import type { PhraseSlurCandidate } from './phraseSlurHelpers';
import { clearPhraseSlur, setPhraseSlur } from './phraseSlurHelpers';

interface PhraseSlurInputProps {
  candidate: PhraseSlurCandidate | null;
  existingSlurGroupId: string | null;
}

// The Connections panel for a selection that crosses between two staves:
// one slur over the whole passage, however many times it changes hands.
export function PhraseSlurInput({
  candidate,
  existingSlurGroupId,
}: PhraseSlurInputProps) {
  const { editStructure } = useCompositionFormSession();

  const choose = (slurred: boolean) =>
    editStructure((s) => {
      const cleared = existingSlurGroupId
        ? clearPhraseSlur(s, existingSlurGroupId)
        : s;
      return slurred && candidate
        ? setPhraseSlur(cleared, candidate.breakpointEntryIds)
        : cleared;
    });

  return (
    <div
      className="flex flex-col gap-3 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-sm text-zinc-500">
        {candidate
          ? `A phrase passed between the hands in ${candidate.legCount} legs.`
          : 'Part of a phrase slur across the staves.'}
      </div>
      <fieldset className="flex flex-col gap-1.5">
        <legend className="text-xs font-medium text-zinc-500 mb-1">
          Phrase slur across staves
        </legend>
        <Radio
          name="phrase-slur"
          label="None"
          checked={!existingSlurGroupId}
          onChange={() => choose(false)}
        />
        <Radio
          name="phrase-slur"
          label="Slur"
          checked={Boolean(existingSlurGroupId)}
          disabled={!candidate}
          onChange={() => choose(true)}
        />
      </fieldset>
    </div>
  );
}
