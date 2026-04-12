import '@one-step-at-a-time/web-components';
import { durationToFactor } from '@one-step-at-a-time/web-components';
import { Fragment } from 'react';
import { useFormContext } from 'react-hook-form';
import { NoteChordInput } from './NoteChordInput';
import type {
  CompositionFormValues,
  Measure,
  MusicEntry,
  Selection,
  Staff,
  StaffType,
} from './types';

type Props = {
  measureIndex: number;
  isMeasureSelected: boolean;
  selection: Selection;
  onSelectMeasure: (id: string) => void;
  onSelectStaff: (
    measureId: string,
    staffId: string,
    e: React.MouseEvent
  ) => void;
  onAddEntry: (measureId: string, staffId: string, entry: MusicEntry) => void;
  onAddStaff: (measureId: string, staffType: StaffType) => void;
};

export function MeasureInput({
  measureIndex,
  isMeasureSelected,
  selection,
  onSelectMeasure,
  onSelectStaff,
  onAddEntry,
  onAddStaff,
}: Props) {
  const { watch } = useFormContext<CompositionFormValues>();
  const measure = watch(`measures.${measureIndex}`) as Measure;
  const keySig = watch('keySig');
  const timeSig = watch('timeSig');
  const mode = watch('mode');

  return (
    <music-measure
      className={`cursor-pointer rounded transition-shadow ${
        isMeasureSelected ? 'rainbow-selected pb-10' : ''
      }`}
      onClick={() => onSelectMeasure(measure.id)}
    >
      {measure.staves.length === 0 && (
        <div className="text-zinc-400 text-sm px-3 py-4 select-none">
          Tap or click here and use the dropdown to add a staff
        </div>
      )}
      {measure.staves.map((staff: Staff, index: number) => {
        const isStaffSelected =
          isMeasureSelected && selection.staffId === staff.id;
        const usedBeats = staff.entries.reduce(
          (sum, entry) => sum + durationToFactor[entry.duration],
          0
        );
        const remainingBeats = 1 - usedBeats;
        const staffClass = `cursor-pointer rounded transition-shadow ${
          isStaffSelected ? 'ring-2 ring-blue-600' : ''
        }`;

        const entryNodes = staff.entries.map((entry, i) =>
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
          <Fragment key={index}>
            {staff.type === 'treble' ? (
              <music-staff-treble
                className={staffClass}
                keySig={keySig}
                time={timeSig}
                onClick={(e) => onSelectStaff(measure.id, staff.id, e)}
              >
                {entryNodes}
              </music-staff-treble>
            ) : (
              <music-staff-bass
                className={staffClass}
                keySig={keySig}
                mode={mode}
                time={timeSig}
                onClick={(e) => onSelectStaff(measure.id, staff.id, e)}
              >
                {entryNodes}
              </music-staff-bass>
            )}
            {isStaffSelected && (
              <NoteChordInput
                onAdd={(entry) => onAddEntry(measure.id, staff.id, entry)}
                remainingBeats={remainingBeats}
              />
            )}
          </Fragment>
        );
      })}
      {isMeasureSelected && (
        <select
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 text-sm border border-zinc-300 rounded bg-white px-2 py-1 cursor-pointer shadow-sm"
          value=""
          onChange={(e) => {
            const value = e.target.value as StaffType;
            if (value) onAddStaff(measure.id, value);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="" disabled>
            Add staff...
          </option>
          <option value="treble">Treble</option>
          <option value="bass">Bass</option>
        </select>
      )}
    </music-measure>
  );
}
