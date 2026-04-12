import '@one-step-at-a-time/web-components';
import { useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { Button } from '../../design-system';
import { BasicInfoInput } from './BasicInfoInput';
import { MeasureInput } from './MeasureInput';
import type {
  CompositionFormValues,
  MusicEntry,
  Selection,
  StaffType,
} from './types';

export function CompositionInput() {
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
          {measures.map((measure, index) => (
            <MeasureInput
              key={measure.id}
              measureIndex={index}
              isMeasureSelected={selection.measureId === measure.id}
              selection={selection}
              onSelectMeasure={selectMeasure}
              onSelectStaff={selectStaff}
              onAddEntry={addEntry}
              onAddStaff={addStaff}
            />
          ))}
          <Button className="place-self-center ml-2" onClick={addMeasure}>
            Add Measure
          </Button>
        </music-composition>
      </div>
    </FormProvider>
  );
}
