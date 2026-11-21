import { Select, TextInput } from '@/design-system';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import {
  notationPartsNear,
  setStaffTrackLabel,
  setStaffTrackPart,
  setStaffTrackTabFor,
  tabLinkProblem,
} from './staffSettingsHelpers';
import type { CompositionFormValues } from './types';
import { useCompositionStructure } from './useCompositionStructure';

interface StaffSettingsInputProps {
  staffId: string;
}

const labelClass = 'text-xs font-medium text-fg-muted';

export function StaffSettingsInput({ staffId }: StaffSettingsInputProps) {
  const { control } = useFormContext<CompositionFormValues>();
  const staff = useWatch({ control, name: `stavesById.${staffId}` });
  const { editStructure } = useCompositionFormSession();
  // Committed on blur/Enter so typing a label is one undo step.
  const [labelDraft, setLabelDraft] = useState(staff?.label ?? '');
  useEffect(() => {
    setLabelDraft(staff?.label ?? '');
  }, [staff?.label]);

  const commitLabel = () =>
    editStructure((s) => setStaffTrackLabel(s, staffId, labelDraft));
  const structure = useCompositionStructure();
  const [partDraft, setPartDraft] = useState(staff?.part ?? '');
  useEffect(() => {
    setPartDraft(staff?.part ?? '');
  }, [staff?.part]);
  const commitPart = () =>
    editStructure((s) => setStaffTrackPart(s, staffId, partDraft));
  const isTab = staff?.type === 'guitar-tab';
  const parts = isTab ? notationPartsNear(structure, staffId) : [];
  const tabFor = staff?.type === 'guitar-tab' ? staff.tabFor ?? '' : '';
  const linkProblem = tabLinkProblem(structure, staffId);

  return (
    <div className="flex flex-col gap-2 p-3">
      <label className="flex flex-col gap-1">
        <span className={labelClass}>Label (every row)</span>
        <TextInput
          type="text"
          placeholder="e.g. Piano, r.h."
          value={labelDraft}
          onChange={(e) => setLabelDraft(e.target.value)}
          onBlur={commitLabel}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitLabel();
            }
          }}
        />
      </label>
      {isTab ? (
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Follows the staff for part</span>
          <Select
            value={tabFor}
            onChange={(e) =>
              editStructure((s) =>
                setStaffTrackTabFor(s, staffId, e.target.value)
              )
            }
          >
            <option value="">nothing</option>
            {[...new Set([...parts, ...(tabFor ? [tabFor] : [])])].map(
              (part) => (
                <option key={part} value={part}>
                  {part}
                </option>
              )
            )}
          </Select>
          {parts.length === 0 && (
            <span className="text-xs text-fg-subtle">
              Name a part on a notation staff in this bar to follow it.
            </span>
          )}
          {linkProblem && (
            <span className="text-xs text-warning">{linkProblem}</span>
          )}
        </label>
      ) : (
        <label className="flex flex-col gap-1">
          <span className={labelClass}>Part (for a guitar tab to follow)</span>
          <TextInput
            type="text"
            placeholder="e.g. guitar"
            value={partDraft}
            onChange={(e) => setPartDraft(e.target.value)}
            onBlur={commitPart}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                commitPart();
              }
            }}
          />
        </label>
      )}
    </div>
  );
}
