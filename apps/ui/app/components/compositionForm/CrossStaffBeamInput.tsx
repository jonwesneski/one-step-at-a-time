import { Button } from '@/design-system';
import type { BeamGroupCandidate } from './beamGroupHelpers';
import {
  clearBeamGroup,
  setBeamGroup,
  sharedBeamGroupId,
} from './beamGroupHelpers';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import type { CompositionStructure } from './types';

interface CrossStaffBeamInputProps {
  candidate: BeamGroupCandidate;
  structure: CompositionStructure;
}

export function CrossStaffBeamInput({
  candidate,
  structure,
}: CrossStaffBeamInputProps) {
  const { editStructure } = useCompositionFormSession();
  const existingGroupId = sharedBeamGroupId(structure, candidate.entryIds);

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-sm text-zinc-500">
        {existingGroupId
          ? 'These entries share one beam across both staves.'
          : `Beam ${candidate.entryIds.length} entries together across both staves.`}
      </div>
      {existingGroupId ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            editStructure((s) => clearBeamGroup(s, existingGroupId))
          }
        >
          Remove cross-staff beam
        </Button>
      ) : (
        <Button
          type="button"
          onClick={() =>
            editStructure((s) => setBeamGroup(s, candidate.entryIds))
          }
        >
          Beam across staves
        </Button>
      )}
    </div>
  );
}
