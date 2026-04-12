import '@one-step-at-a-time/web-components';
import { durationToFactor } from '@one-step-at-a-time/web-components';
import { useFormContext } from 'react-hook-form';
import { NoteChordInput } from './NoteChordInput';
import type { CompositionFormValues, DraftMusicEntry } from './types';

type Props = {
  staffId: string;
  measureId: string;
  isSelected: boolean;
  onSelectStaff: (measureId: string, staffId: string, e: React.MouseEvent) => void;
  onAddEntry: (measureId: string, staffId: string, entry: DraftMusicEntry) => void;
};

export function StaffInput({
  staffId,
  measureId,
  isSelected,
  onSelectStaff,
  onAddEntry,
}: Props) {
  const { watch } = useFormContext<CompositionFormValues>();
  const staff = watch(`stavesById.${staffId}`);
  const entriesById = watch('entriesById');
  const keySig = watch('keySig');
  const timeSig = watch('timeSig');
  const mode = watch('mode');

  const entries = staff.entryIds.map((eid) => entriesById[eid]);

  const usedBeats = entries.reduce(
    (sum, entry) => sum + durationToFactor[entry.duration],
    0
  );
  const remainingBeats = 1 - usedBeats;

  const staffClass = `cursor-pointer rounded transition-shadow ${
    isSelected ? 'rainbow-selected' : ''
  }`;

  const entryNodes = entries.map((entry, i) =>
    entry.type === 'note' ? (
      <music-note key={i} value={entry.value} duration={entry.duration} />
    ) : (
      <music-chord key={i} duration={entry.duration}>
        {entry.notes.map((n, j) => (
          <music-note key={j} value={n} />
        ))}
      </music-chord>
    )
  );

  return (
    <>
      {staff.type === 'treble' ? (
        <music-staff-treble
          className={staffClass}
          keySig={keySig}
          time={timeSig}
          onClick={(e) => onSelectStaff(measureId, staffId, e)}
        >
          {entryNodes}
        </music-staff-treble>
      ) : (
        <music-staff-bass
          className={staffClass}
          keySig={keySig}
          mode={mode}
          time={timeSig}
          onClick={(e) => onSelectStaff(measureId, staffId, e)}
        >
          {entryNodes}
        </music-staff-bass>
      )}
      {isSelected && (
        <NoteChordInput
          onAdd={(entry) => onAddEntry(measureId, staffId, entry)}
          remainingBeats={remainingBeats}
        />
      )}
    </>
  );
}
