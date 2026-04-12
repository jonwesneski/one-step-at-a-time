import '@one-step-at-a-time/web-components';
import { durationToFactor } from '@one-step-at-a-time/web-components';
import { Fragment, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { Button } from '../../design-system';
import { BasicInfoInput } from './BasicInfoInput';
import { NoteChordInput } from './NoteChordInput';
import type {
  CompositionFormValues,
  MusicEntry,
  Selection,
  Staff,
  StaffType,
} from './types';

export function CompositionEditor() {
  const [selection, setSelection] = useState<Selection>({
    measureId: null,
    staffId: null,
  });

  const methods = useForm<CompositionFormValues>({
    defaultValues: {
      title: '',
      keySig: 'C',
      timeSig: '4/4',
      mode: 'major',
      tab: 'note',
      measures: [{ id: crypto.randomUUID(), staves: [] }],
    },
  });

  const keySig = useWatch({ control: methods.control, name: 'keySig' });
  const timeSig = useWatch({ control: methods.control, name: 'timeSig' });
  const mode = useWatch({ control: methods.control, name: 'mode' });
  const measures = useWatch({ control: methods.control, name: 'measures' });

  function addMeasure() {
    const newId = crypto.randomUUID();
    const prev = methods.getValues('measures');
    const lastMeasure = prev[prev.length - 1];
    const staves = lastMeasure.staves.map((s) => ({
      ...s,
      id: crypto.randomUUID(),
      entries: [],
    }));
    methods.setValue('measures', [...prev, { id: newId, staves }]);
    setSelection({ measureId: newId, staffId: null });
  }

  function addStaff(measureId: string, staffType: StaffType) {
    const prev = methods.getValues('measures');
    methods.setValue(
      'measures',
      prev.map((m) =>
        m.id === measureId
          ? {
              ...m,
              staves: [
                ...m.staves,
                { id: crypto.randomUUID(), type: staffType, entries: [] },
              ],
            }
          : m
      )
    );
  }

  function addEntry(measureId: string, staffId: string, entry: MusicEntry) {
    const prev = methods.getValues('measures');
    methods.setValue(
      'measures',
      prev.map((m) =>
        m.id === measureId
          ? {
              ...m,
              staves: m.staves.map((s) =>
                s.id === staffId ? { ...s, entries: [...s.entries, entry] } : s
              ),
            }
          : m
      )
    );
  }

  function selectMeasure(id: string) {
    setSelection({ measureId: id, staffId: null });
  }

  function selectStaff(
    measureId: string,
    staffId: string,
    e: React.MouseEvent
  ) {
    e.stopPropagation();
    setSelection({ measureId, staffId });
  }

  return (
    <FormProvider {...methods}>
      <div className="flex flex-col gap-4">
        <header className="p-3 bg-white rounded border border-zinc-200 shadow-sm">
          <BasicInfoInput />
        </header>

        <music-composition keySig={keySig} mode={mode} time={timeSig}>
          {measures.map((measure) => {
            const isMeasureSelected = selection.measureId === measure.id;
            return (
              <music-measure
                key={measure.id}
                className={`cursor-pointer rounded transition-shadow ${
                  isMeasureSelected ? 'rainbow-selected pb-10' : ''
                }`}
                onClick={() => selectMeasure(measure.id)}
              >
                {measure.staves.length === 0 && (
                  <div className="text-zinc-400 text-sm px-3 py-4 select-none">
                    Select this measure and use the dropdown to add a staff
                  </div>
                )}
                {measure.staves.map((staff: Staff, index: number) => {
                  const isMeasureSelectedForStaff =
                    selection.measureId === measure.id;
                  const isStaffSelected =
                    isMeasureSelectedForStaff && selection.staffId === staff.id;
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
                      <music-note
                        key={i}
                        value={entry.value}
                        duration={entry.duration}
                      />
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
                          onClick={(e) => selectStaff(measure.id, staff.id, e)}
                        >
                          {entryNodes}
                        </music-staff-treble>
                      ) : (
                        <music-staff-bass
                          className={staffClass}
                          keySig={keySig}
                          mode={mode}
                          time={timeSig}
                          onClick={(e) => selectStaff(measure.id, staff.id, e)}
                        >
                          {entryNodes}
                        </music-staff-bass>
                      )}
                      {isStaffSelected && (
                        <NoteChordInput
                          onAdd={(entry) =>
                            addEntry(measure.id, staff.id, entry)
                          }
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
          <Button className="place-self-center ml-2" onClick={addMeasure}>
            Add Measure
          </Button>
        </music-composition>
      </div>
    </FormProvider>
  );
}
