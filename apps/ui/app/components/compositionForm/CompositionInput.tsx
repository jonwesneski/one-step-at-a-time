import '@one-step-at-a-time/web-components';
import { useCallback, useEffect, useState } from 'react';
import { FormProvider, useForm, useWatch } from 'react-hook-form';
import { Button } from '../../design-system';
import { useUndoRedo } from '../../hooks/useUndoRedo';
import { BasicInfoInput } from './BasicInfoInput';
import { CompositionFormSessionProvider } from './CompositionFormSessionContext';
import { MeasureInput } from './MeasureInput';
import type {
  CompositionFormValues,
  CompositionStructure,
  DraftMusicEntry,
  Selection,
  StaffType,
} from './types';

const firstMeasureId = crypto.randomUUID();

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
      measureOrder: [firstMeasureId],
      measuresById: { [firstMeasureId]: { id: firstMeasureId, staffIds: [] } },
      stavesById: {},
      entriesById: {},
    },
  });

  const keySig = useWatch({ control: methods.control, name: 'keySig' });
  const timeSig = useWatch({ control: methods.control, name: 'timeSig' });
  const mode = useWatch({ control: methods.control, name: 'mode' });
  const measureOrder = useWatch({
    control: methods.control,
    name: 'measureOrder',
  });
  const measuresById = useWatch({
    control: methods.control,
    name: 'measuresById',
  });
  const lastMeasureStaffCount =
    measuresById[measureOrder[measureOrder.length - 1]]?.staffIds.length ?? 0;

  const getStructure = useCallback(
    (): CompositionStructure => ({
      measureOrder: methods.getValues('measureOrder'),
      measuresById: methods.getValues('measuresById'),
      stavesById: methods.getValues('stavesById'),
      entriesById: methods.getValues('entriesById'),
    }),
    [methods]
  );

  const setStructure = useCallback(
    (s: CompositionStructure) => {
      methods.setValue('measureOrder', s.measureOrder);
      methods.setValue('measuresById', s.measuresById);
      methods.setValue('stavesById', s.stavesById);
      methods.setValue('entriesById', s.entriesById);
    },
    [methods]
  );

  const { record, undo, redo, canUndo, canRedo } = useUndoRedo(
    getStructure,
    setStructure
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && !e.shiftKey && key === 'z') {
        e.preventDefault();
        undo();
      }
      if (mod && ((e.shiftKey && key === 'z') || key === 'y')) {
        e.preventDefault();
        redo();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo]);

  function addMeasure() {
    const s = getStructure();
    const newId = crypto.randomUUID();
    const lastMeasure =
      s.measuresById[s.measureOrder[s.measureOrder.length - 1]];
    // Copying the staff structure from the last measure
    const newStaffEntries = lastMeasure.staffIds.map((sid) => {
      const newSid = crypto.randomUUID();
      return {
        newSid,
        staff: { ...s.stavesById[sid], id: newSid, entryIds: [] },
      };
    });
    record({
      ...s,
      measureOrder: [...s.measureOrder, newId],
      measuresById: {
        ...s.measuresById,
        [newId]: { id: newId, staffIds: newStaffEntries.map((x) => x.newSid) },
      },
      stavesById: {
        ...s.stavesById,
        ...Object.fromEntries(newStaffEntries.map((x) => [x.newSid, x.staff])),
      },
    });
    setSelection({ measureId: newId, staffId: null });
  }

  function addStaff(measureId: string, staffType: StaffType) {
    const s = getStructure();
    const newSid = crypto.randomUUID();
    record({
      ...s,
      measuresById: {
        ...s.measuresById,
        [measureId]: {
          ...s.measuresById[measureId],
          staffIds: [...s.measuresById[measureId].staffIds, newSid],
        },
      },
      stavesById: {
        ...s.stavesById,
        [newSid]: { id: newSid, type: staffType, entryIds: [] },
      },
    });
  }

  function addEntry(
    measureId: string,
    staffId: string,
    entry: DraftMusicEntry
  ) {
    const s = getStructure();
    const newEid = crypto.randomUUID();
    record({
      ...s,
      stavesById: {
        ...s.stavesById,
        [staffId]: {
          ...s.stavesById[staffId],
          entryIds: [...s.stavesById[staffId].entryIds, newEid],
        },
      },
      entriesById: {
        ...s.entriesById,
        [newEid]: { ...entry, id: newEid },
      },
    });
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
    <CompositionFormSessionProvider>
      <FormProvider {...methods}>
        <div className="flex flex-col gap-4">
          <div className="p-3 bg-white rounded border border-zinc-200 shadow-sm">
            <BasicInfoInput />
          </div>

          <div className="flex gap-2">
            <Button onClick={undo} disabled={!canUndo}>
              Undo
            </Button>
            <Button onClick={redo} disabled={!canRedo}>
              Redo
            </Button>
          </div>

          <music-composition keySig={keySig} mode={mode} time={timeSig}>
            {measureOrder.map((measureId) => (
              <MeasureInput
                key={measureId}
                measureId={measureId}
                isMeasureSelected={selection.measureId === measureId}
                selection={selection}
                onSelectMeasure={selectMeasure}
                onSelectStaff={selectStaff}
                onAddEntry={addEntry}
                onAddStaff={addStaff}
              />
            ))}
            <Button
              className="place-self-center ml-2"
              disabled={lastMeasureStaffCount === 0}
              onClick={addMeasure}
            >
              Add Measure
            </Button>
          </music-composition>
        </div>
      </FormProvider>
    </CompositionFormSessionProvider>
  );
}
