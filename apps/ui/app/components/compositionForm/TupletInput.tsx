import { Button, Checkbox, Select } from '@/design-system';
import type { TupletRatio } from '@one-step-at-a-time/web-components';
import { TUPLET_RATIOS } from '@one-step-at-a-time/web-components';
import { useState } from 'react';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import { OptionalSelect } from './entryControls';
import { tupletRatioFits } from './measureCapacityHelpers';
import type { CrossStaffTupletCandidate } from './tupletsHelpers';
import {
  crossStaffTupletCandidate,
  crossStaffTupletOf,
  setCrossStaffTuplet,
  setTupletPlacement,
  tupletCandidate,
  tupletOfEntries,
} from './tupletsHelpers';
import type { CompositionStructure } from './types';
import { TUPLET_PLACEMENT_OPTIONS } from './types';

const RATIO_LABEL: Partial<Record<TupletRatio, string>> = {
  '2': '2 (duplet)',
  '3': '3 (triplet)',
  '5': '5 (quintuplet)',
  '6': '6 (sextuplet)',
  '7': '7 (septuplet)',
};

interface TupletInputProps {
  structure: CompositionStructure;
}

export function TupletInput({ structure }: TupletInputProps) {
  const { session, setTuplet, editStructure } = useCompositionFormSession();
  const candidate = tupletCandidate(session.selection, structure);
  const crossStaffCandidate = crossStaffTupletCandidate(
    session.selection,
    structure
  );

  if (crossStaffCandidate) {
    return (
      <CrossStaffTupletFields
        candidate={crossStaffCandidate}
        structure={structure}
      />
    );
  }

  if (!candidate) {
    return (
      <div className="p-3 text-sm text-zinc-400">
        Select two or more adjacent notes in one staff to make a tuplet.
      </div>
    );
  }

  const current = tupletOfEntries(structure, candidate.entryIds);
  const value = current?.ratio ?? '';
  const ratioOptions = TUPLET_RATIOS.filter(
    (ratio) =>
      ratio === value || tupletRatioFits(structure, candidate.entryIds, ratio)
  );

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-sm text-zinc-500">
        {candidate.entryIds.length} entries
      </div>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-zinc-500">Ratio</span>
        <Select
          value={value}
          onChange={(e) =>
            setTuplet(
              candidate.entryIds,
              e.target.value ? (e.target.value as TupletRatio) : null
            )
          }
        >
          <option value="">none</option>
          {ratioOptions.map((r) => (
            <option key={r} value={r}>
              {RATIO_LABEL[r] ?? r}
            </option>
          ))}
        </Select>
      </label>
      {current && (
        <OptionalSelect
          label="Bracket side"
          options={TUPLET_PLACEMENT_OPTIONS}
          value={current.placement}
          onChange={(placement) =>
            editStructure((s) => setTupletPlacement(s, current.id, placement))
          }
          noneLabel="auto"
        />
      )}
      {current && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setTuplet(candidate.entryIds, null)}
        >
          Remove tuplet
        </Button>
      )}
    </div>
  );
}

// One tuplet over a line passed between the hands: a tuplet on each staff,
// linked, with the rests standing in for the other hand's beats hidden.
function CrossStaffTupletFields({
  candidate,
  structure,
}: {
  candidate: CrossStaffTupletCandidate;
  structure: CompositionStructure;
}) {
  const { editStructure } = useCompositionFormSession();
  const [hideRests, setHideRests] = useState(true);
  const current = crossStaffTupletOf(structure, candidate);
  const value = current?.[0].ratio ?? '';
  const ratioOptions = TUPLET_RATIOS.filter(
    (ratio) =>
      ratio === value ||
      candidate.runs.every((run) =>
        tupletRatioFits(structure, run.entryIds, ratio)
      )
  );
  const setRatio = (ratio: TupletRatio | null) =>
    editStructure((s) =>
      setCrossStaffTuplet(s, candidate, ratio, { hideRests })
    );

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-sm text-zinc-500">One tuplet across both hands</div>
      <label className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-zinc-500">Ratio</span>
        <Select
          value={value}
          onChange={(e) =>
            setRatio(e.target.value ? (e.target.value as TupletRatio) : null)
          }
        >
          <option value="">none</option>
          {ratioOptions.map((r) => (
            <option key={r} value={r}>
              {RATIO_LABEL[r] ?? r}
            </option>
          ))}
        </Select>
      </label>
      {!current && (
        <Checkbox
          label="Hide the rests inside"
          checked={hideRests}
          onChange={(e) => setHideRests(e.target.checked)}
        />
      )}
      {current && (
        <OptionalSelect
          label="Bracket side"
          options={TUPLET_PLACEMENT_OPTIONS}
          value={current[0].placement}
          onChange={(placement) =>
            editStructure((s) =>
              current.reduce(
                (next, tuplet) =>
                  setTupletPlacement(next, tuplet.id, placement),
                s
              )
            )
          }
          noneLabel="auto"
        />
      )}
      {current && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => setRatio(null)}
        >
          Remove tuplet
        </Button>
      )}
    </div>
  );
}
