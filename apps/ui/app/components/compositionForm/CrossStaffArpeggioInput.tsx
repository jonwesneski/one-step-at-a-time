import { Button } from '@/design-system';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import type { CrossStaffArpeggioPair } from './crossStaffArpeggioHelpers';
import {
  crossStaffArpeggioProblem,
  isCrossStaffArpeggio,
  setCrossStaffArpeggio,
} from './crossStaffArpeggioHelpers';
import type { CompositionStructure } from './types';

interface CrossStaffArpeggioInputProps {
  pair: CrossStaffArpeggioPair;
  structure: CompositionStructure;
}

export function CrossStaffArpeggioInput({
  pair,
  structure,
}: CrossStaffArpeggioInputProps) {
  const { editStructure } = useCompositionFormSession();
  const joined = isCrossStaffArpeggio(structure, pair);
  const problem = joined ? null : crossStaffArpeggioProblem(structure, pair);

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-sm text-fg-muted">
        {joined
          ? 'One arpeggio line runs through both chords.'
          : 'Draw one unbroken arpeggio line through both chords.'}
      </div>
      {problem && <div className="text-xs text-fg-subtle">{problem}</div>}
      <Button
        type="button"
        variant={joined ? 'secondary' : undefined}
        disabled={problem !== null}
        onClick={() =>
          editStructure((s) => setCrossStaffArpeggio(s, pair, !joined))
        }
      >
        {joined ? 'Separate the arpeggios' : 'Join into one arpeggio'}
      </Button>
    </div>
  );
}
