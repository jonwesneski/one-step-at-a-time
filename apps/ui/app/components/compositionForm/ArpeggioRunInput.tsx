import { Button, Checkbox } from '@/design-system';
import { ARPEGGIO_UNMATCHED_MODES } from '@one-step-at-a-time/web-components';
import type { ArpeggioCandidate } from './arpeggiosHelpers';
import { arpeggioOf, setArpeggio, updateArpeggio } from './arpeggiosHelpers';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import { OptionalSelect } from './entryControls';
import type { CompositionStructure } from './types';

type Unmatched = (typeof ARPEGGIO_UNMATCHED_MODES)[number];

// A written-out arpeggio: the selected run of notes, each tied into its
// matching tone of the last selected note or chord. The run takes no beat
// time.
export function ArpeggioRunInput({
  candidate,
  structure,
}: {
  candidate: ArpeggioCandidate;
  structure: CompositionStructure;
}) {
  const { editStructure } = useCompositionFormSession();
  const existing = arpeggioOf(structure, candidate);

  if (!existing) {
    return (
      <div
        className="flex flex-col gap-2 p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-sm text-zinc-500">
          Tie the run of notes into the last selected chord. The run takes no
          beat time.
        </div>
        {candidate.problem && (
          <div className="text-xs text-zinc-400">{candidate.problem}</div>
        )}
        <Button
          type="button"
          disabled={candidate.problem !== null}
          onClick={() => editStructure((s) => setArpeggio(s, candidate, {}))}
        >
          Write out as an arpeggio
        </Button>
      </div>
    );
  }

  const update = (patch: Parameters<typeof updateArpeggio>[2]) =>
    editStructure((s) => updateArpeggio(s, existing.id, patch));

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <OptionalSelect<Unmatched>
        label="A run note not in the chord"
        options={ARPEGGIO_UNMATCHED_MODES}
        value={existing.unmatched}
        noneLabel="default (lv tie)"
        onChange={(unmatched) => update({ unmatched })}
      />
      <Checkbox
        label="Show “l.v.” on its open ties"
        checked={existing.lvLabel ?? false}
        onChange={(e) => update({ lvLabel: e.target.checked })}
      />
      <Button
        type="button"
        variant="secondary"
        onClick={() => editStructure((s) => setArpeggio(s, candidate, null))}
      >
        Remove arpeggio
      </Button>
    </div>
  );
}
