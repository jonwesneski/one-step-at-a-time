import '@one-step-at-a-time/web-components';
import { durationToFactor } from '@one-step-at-a-time/web-components';
import { Fragment, useState } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { NoteChordInput } from './NoteChordInput';
import type {
  Measure,
  MusicEntry,
  NoteFormValues,
  Selection,
  Staff,
  StaffType,
} from './types';

export function CompositionEditor() {
  const [measures, setMeasures] = useState<Measure[]>([
    { id: crypto.randomUUID(), staves: [] },
  ]);
  const [selection, setSelection] = useState<Selection>({
    measureId: null,
    staffType: null,
  });

  const methods = useForm<NoteFormValues>({
    defaultValues: {
      tab: 'note',
      noteValue: 'C',
      noteDuration: 'quarter',
      chordNotes: [{ value: 'C' }, { value: 'E' }],
      chordDuration: 'quarter',
    },
  });

  function addMeasure() {
    const newId = crypto.randomUUID();
    setMeasures((prev) => {
      const lastMeasure = prev[prev.length - 1];
      const staves = lastMeasure.staves.map((s) => ({ ...s, entries: [] }));
      return [...prev, { id: newId, staves }];
    });
    setSelection({ measureId: newId, staffType: null });
  }

  function addStaff(measureId: string, staffType: StaffType) {
    setMeasures((prev) =>
      prev.map((m) =>
        m.id === measureId
          ? { ...m, staves: [...m.staves, { type: staffType, entries: [] }] }
          : m
      )
    );
  }

  function addEntry(measureId: string, staffType: StaffType, entry: MusicEntry) {
    setMeasures((prev) =>
      prev.map((m) =>
        m.id === measureId
          ? {
              ...m,
              staves: m.staves.map((s) =>
                s.type === staffType
                  ? { ...s, entries: [...s.entries, entry] }
                  : s
              ),
            }
          : m
      )
    );
  }

  function selectMeasure(id: string) {
    setSelection({ measureId: id, staffType: null });
  }

  function selectStaff(measureId: string, staffType: StaffType, e: React.MouseEvent) {
    e.stopPropagation();
    setSelection({ measureId, staffType });
  }

  const btnPrimary =
    'px-3 py-1.5 text-sm rounded border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer';

  return (
    <div className="flex flex-col gap-4">
      <header className="p-3 bg-white rounded border border-zinc-200 shadow-sm" />

      <music-composition>
        {measures.map((measure) => {
          const isMeasureSelected = selection.measureId === measure.id;
          return (
            <music-measure
              key={measure.id}
              className={`cursor-pointer rounded transition-shadow ${
                isMeasureSelected ? 'ring-2 ring-blue-400' : ''
              } ${isMeasureSelected ? 'pb-10' : ''}`}
              onClick={() => selectMeasure(measure.id)}
            >
              {measure.staves.length === 0 && (
                <div className="text-zinc-400 text-sm px-3 py-4 select-none">
                  Select this measure and use the dropdown to add a staff
                </div>
              )}
              {measure.staves.map((staff: Staff, index: number) => {
                const isMeasureSelectedForStaff = selection.measureId === measure.id;
                const isStaffSelected =
                  isMeasureSelectedForStaff && selection.staffType === staff.type;
                const usedBeats = staff.entries.reduce(
                  (sum, entry) => sum + durationToFactor[entry.duration],
                  0
                );
                const remainingBeats = 1 - usedBeats; // 4/4 measure = 1.0
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
                        onClick={(e) => selectStaff(measure.id, staff.type, e)}
                      >
                        {entryNodes}
                      </music-staff-treble>
                    ) : (
                      <music-staff-bass
                        className={staffClass}
                        onClick={(e) => selectStaff(measure.id, staff.type, e)}
                      >
                        {entryNodes}
                      </music-staff-bass>
                    )}
                    {isStaffSelected && (
                      <FormProvider {...methods}>
                        <NoteChordInput
                          onAdd={(entry) => addEntry(measure.id, staff.type, entry)}
                          remainingBeats={remainingBeats}
                        />
                      </FormProvider>
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
                    if (value) addStaff(measure.id, value);
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
        })}
        <button
          className={`${btnPrimary} place-self-center ml-2`}
          onClick={addMeasure}
        >
          Add Measure
        </button>
      </music-composition>
    </div>
  );
}
