import { Button, Checkbox, Select } from '@/design-system';
import type {
  TremoloBeamAttach,
  TremoloStrokeCount,
} from '@one-step-at-a-time/web-components';
import {
  TREMOLO_BEAM_ATTACHES,
  TREMOLO_STROKE_COUNTS,
} from '@one-step-at-a-time/web-components';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import { OptionalSelect } from './entryControls';
import type {
  CrossStaffTremoloCandidate,
  TremoloCandidate,
} from './tremolosHelpers';
import {
  canAttachBeams,
  crossStaffTremoloOf,
  DEFAULT_TREMOLO_STROKES,
  setCrossStaffTremolo,
  setTremolo,
  tremoloOfEntries,
  updateTremolo,
} from './tremolosHelpers';
import type { CompositionStructure, NormalizedTremolo } from './types';

const labelClass = 'text-xs font-medium text-fg-muted';

function StrokesSelect({
  value,
  onChange,
}: {
  value: TremoloStrokeCount;
  onChange: (value: TremoloStrokeCount) => void;
}) {
  return (
    <label className="flex flex-col gap-0.5">
      <span className={labelClass}>Beams between the notes</span>
      <Select
        value={String(value)}
        onChange={(e) => onChange(Number(e.target.value) as TremoloStrokeCount)}
      >
        {TREMOLO_STROKE_COUNTS.map((count) => (
          <option key={count} value={String(count)}>
            {count}
          </option>
        ))}
      </Select>
    </label>
  );
}

function TremoloSettings({
  tremolo,
  memberCount,
  structure,
}: {
  tremolo: NormalizedTremolo;
  memberCount: number;
  structure: CompositionStructure;
}) {
  const { editStructure } = useCompositionFormSession();
  const update = (patch: Parameters<typeof updateTremolo>[2]) =>
    editStructure((s) => updateTremolo(s, tremolo.id, patch));
  return (
    <>
      <StrokesSelect
        value={tremolo.strokes}
        onChange={(strokes) => update({ strokes })}
      />
      {canAttachBeams(structure, tremolo.id) && (
        <OptionalSelect<TremoloBeamAttach>
          label="Beams joined to the stems"
          options={TREMOLO_BEAM_ATTACHES}
          value={tremolo.beamAttach}
          noneLabel="none (detached)"
          onChange={(beamAttach) => update({ beamAttach })}
        />
      )}
      {memberCount === 2 && !tremolo.crossStaffGroupId && (
        <Checkbox
          label="Beams between the noteheads (notes an octave or more apart)"
          checked={tremolo.beamPosition === 'between'}
          onChange={(e) =>
            update({ beamPosition: e.target.checked ? 'between' : null })
          }
        />
      )}
    </>
  );
}

// A tremolo alternating between the selected notes or chords, all written at
// the tremolo's full value.
export function TremoloGroupInput({
  candidate,
  structure,
}: {
  candidate: TremoloCandidate;
  structure: CompositionStructure;
}) {
  const { editStructure } = useCompositionFormSession();
  const existing = tremoloOfEntries(structure, candidate.entryIds);

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      {existing ? (
        <>
          <TremoloSettings
            tremolo={existing}
            memberCount={candidate.entryIds.length}
            structure={structure}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              editStructure((s) => setTremolo(s, candidate.entryIds, null))
            }
          >
            Remove tremolo
          </Button>
        </>
      ) : (
        <>
          <div className="text-sm text-fg-muted">
            Alternate between these notes for one written value. Write each at
            the tremolo’s full length.
          </div>
          {candidate.problem && (
            <div className="text-xs text-fg-subtle">{candidate.problem}</div>
          )}
          <Button
            type="button"
            disabled={candidate.problem !== null}
            onClick={() =>
              editStructure((s) =>
                setTremolo(s, candidate.entryIds, {
                  strokes: DEFAULT_TREMOLO_STROKES,
                })
              )
            }
          >
            Make a tremolo
          </Button>
        </>
      )}
    </div>
  );
}

// One tremolo passed between the hands: each staff's run holds its notes plus
// rests (hidden) for the other hand's share.
export function CrossStaffTremoloInput({
  candidate,
  structure,
}: {
  candidate: CrossStaffTremoloCandidate;
  structure: CompositionStructure;
}) {
  const { editStructure } = useCompositionFormSession();
  const joined = crossStaffTremoloOf(structure, candidate);

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      {joined ? (
        <>
          <TremoloSettings
            tremolo={joined[0]}
            memberCount={candidate.runs[0].entryIds.length}
            structure={structure}
          />
          <Button
            type="button"
            variant="secondary"
            onClick={() =>
              editStructure((s) => setCrossStaffTremolo(s, candidate, null))
            }
          >
            Separate the hands
          </Button>
        </>
      ) : (
        <>
          <div className="text-sm text-fg-muted">
            Join both hands into one tremolo. Rests in the selection are hidden
            as spacers for the other hand.
          </div>
          {candidate.problem && (
            <div className="text-xs text-fg-subtle">{candidate.problem}</div>
          )}
          <Button
            type="button"
            disabled={candidate.problem !== null}
            onClick={() =>
              editStructure((s) =>
                setCrossStaffTremolo(s, candidate, DEFAULT_TREMOLO_STROKES)
              )
            }
          >
            Join into one tremolo
          </Button>
        </>
      )}
    </div>
  );
}
