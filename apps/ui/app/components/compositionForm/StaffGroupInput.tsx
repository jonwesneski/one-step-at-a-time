import { Radio } from '@/design-system';
import type { StaffGroupType } from '@one-step-at-a-time/web-components';
import { useFormContext } from 'react-hook-form';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import { findGroupMembers } from './staffGroupsHelpers';
import type { CompositionFormValues, StaffType } from './types';

interface StaffGroupInputProps {
  measureId: string;
  staffIds: string[];
}

type GroupChoice = 'none' | StaffGroupType;

const STAFF_TYPE_LABEL: Record<StaffType, string> = {
  treble: 'Treble',
  bass: 'Bass',
  vocal: 'Vocal',
  'guitar-tab': 'Guitar tab',
};

export function StaffGroupInput({ measureId, staffIds }: StaffGroupInputProps) {
  const { watch } = useFormContext<CompositionFormValues>();
  const measure = watch(`measuresById.${measureId}`);
  const stavesById = watch('stavesById');
  const { setStaffGroup } = useCompositionFormSession();

  const orderedStaffIds = measure.staffIds.filter((id) =>
    staffIds.includes(id)
  );
  const indices = orderedStaffIds.map((id) => measure.staffIds.indexOf(id));
  const isContiguous =
    indices.length > 0 &&
    indices[indices.length - 1] - indices[0] === indices.length - 1;

  const firstId = orderedStaffIds[0];
  const members = firstId
    ? findGroupMembers(measure.staffIds, stavesById, firstId)
    : [];
  const matchesSelection =
    members.length === orderedStaffIds.length &&
    members.every((id, i) => id === orderedStaffIds[i]);
  const currentChoice: GroupChoice = matchesSelection
    ? stavesById[firstId].group ??
      (stavesById[firstId].groupId ? 'bracket' : 'none')
    : 'none';

  const canBrace = isContiguous && orderedStaffIds.length === 2;
  const canBracket = isContiguous && orderedStaffIds.length >= 2;

  function applyChoice(choice: GroupChoice) {
    setStaffGroup(
      measureId,
      orderedStaffIds,
      choice === 'none' ? null : choice
    );
  }

  return (
    <div className="flex flex-col gap-2 p-3">
      <div className="text-sm text-zinc-500">
        {orderedStaffIds
          .map((id) => STAFF_TYPE_LABEL[stavesById[id].type])
          .join(', ')}
      </div>
      {!isContiguous && (
        <div className="text-sm text-red-600">
          Selected staves must be adjacent to form a group.
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Radio
          name="staff-group"
          label="None"
          checked={currentChoice === 'none'}
          onChange={() => applyChoice('none')}
        />
        <Radio
          name="staff-group"
          label="Brace"
          checked={currentChoice === 'grand'}
          disabled={!canBrace}
          onChange={() => applyChoice('grand')}
        />
        <Radio
          name="staff-group"
          label="Bracket"
          checked={currentChoice === 'bracket'}
          disabled={!canBracket}
          onChange={() => applyChoice('bracket')}
        />
      </div>
    </div>
  );
}
