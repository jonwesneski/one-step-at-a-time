import { Button } from '@/design-system';
import { useUndoRedo } from '@/hooks/useUndoRedo';
import '@one-step-at-a-time/web-components';
import type {
  StaffGroupType,
  TimeSignature,
  TupletRatio,
} from '@one-step-at-a-time/web-components';
import { useCallback, useEffect } from 'react';
import {
  FormProvider,
  useForm,
  useFormContext,
  useWatch,
} from 'react-hook-form';
import { BasicInfoInput } from './BasicInfoInput';
import {
  CompositionFormSessionProvider,
  useCompositionFormSession,
} from './CompositionFormSessionContext';
import {
  connectorBetween,
  removeConnector,
  upsertConnector,
} from './connectorsHelpers';
import { DragSelectOverlay } from './DragSelectOverlay';
import { applyEntryUpdate } from './entryEditsHelpers';
import { MeasureInput } from './MeasureInput';
import { rebar } from './rebarHelpers';
import {
  moveEntryInVoice,
  moveEntryToVoice as moveEntryToVoiceInStructure,
} from './reorderHelpers';
import { findGroupMembers } from './staffGroupsHelpers';
import { TimeSignatureChangeDialog } from './TimeSignatureChangeDialog';
import { setTuplet as setTupletInStructure } from './tupletsHelpers';
import type {
  CompositionFormValues,
  CompositionStructure,
  ConnectorKind,
  DraftMusicEntry,
  MusicEntry,
  StaffType,
} from './types';
import { isSelectionEmpty } from './types';
import {
  addVoiceToStaff,
  createDefaultVoice,
  removeVoiceFromStaff,
} from './voiceHelpers';

const firstMeasureId = crypto.randomUUID();

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof HTMLElement &&
    (target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable)
  );
}

function CompositionFormBody({
  undo,
  redo,
  canUndo,
  canRedo,
}: {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
}) {
  const { control } = useFormContext<CompositionFormValues>();
  const keySig = useWatch({ control, name: 'keySig' });
  const timeSig = useWatch({ control, name: 'timeSig' });
  const mode = useWatch({ control, name: 'mode' });
  const measureOrder = useWatch({ control, name: 'measureOrder' });
  const measuresById = useWatch({ control, name: 'measuresById' });
  const lastMeasureStaffCount =
    measuresById[measureOrder[measureOrder.length - 1]]?.staffIds.length ?? 0;

  const { session, deleteSelected, addMeasure } = useCompositionFormSession();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();
      if (mod && !e.shiftKey && key === 'z') {
        e.preventDefault();
        undo();
        return;
      }
      if (mod && ((e.shiftKey && key === 'z') || key === 'y')) {
        e.preventDefault();
        redo();
        return;
      }
      if (
        (e.key === 'Backspace' || e.key === 'Delete') &&
        !isEditableTarget(e.target) &&
        !isSelectionEmpty(session.selection)
      ) {
        e.preventDefault();
        deleteSelected();
      }
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [undo, redo, deleteSelected, session.selection]);

  return (
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
        <Button
          onClick={deleteSelected}
          disabled={isSelectionEmpty(session.selection)}
        >
          Delete Selected
        </Button>
      </div>

      <DragSelectOverlay>
        <music-composition key-sig={keySig} mode={mode} time={timeSig}>
          {measureOrder.map((measureId) => (
            <MeasureInput key={measureId} measureId={measureId} />
          ))}
          <Button
            className="place-self-center ml-2"
            disabled={measureOrder.length > 0 && lastMeasureStaffCount === 0}
            onClick={addMeasure}
          >
            Add Measure
          </Button>
        </music-composition>
      </DragSelectOverlay>

      <TimeSignatureChangeDialog />
    </div>
  );
}

export function CompositionInput() {
  const methods = useForm<CompositionFormValues>({
    defaultValues: {
      title: '',
      keySig: 'C',
      mode: 'major',
      timeSig: '4/4',
      measureOrder: [firstMeasureId],
      measuresById: { [firstMeasureId]: { id: firstMeasureId, staffIds: [] } },
      stavesById: {},
      entriesById: {},
      connectorsById: {},
      connectorOrder: [],
      tupletsById: {},
    },
  });

  const getStructure = useCallback(
    (): CompositionStructure => ({
      timeSig: methods.getValues('timeSig'),
      measureOrder: methods.getValues('measureOrder'),
      measuresById: methods.getValues('measuresById'),
      stavesById: methods.getValues('stavesById'),
      entriesById: methods.getValues('entriesById'),
      connectorsById: methods.getValues('connectorsById'),
      connectorOrder: methods.getValues('connectorOrder'),
      tupletsById: methods.getValues('tupletsById'),
    }),
    [methods]
  );

  const setStructure = useCallback(
    (s: CompositionStructure) => {
      methods.setValue('timeSig', s.timeSig);
      methods.setValue('measureOrder', s.measureOrder);
      methods.setValue('measuresById', s.measuresById);
      methods.setValue('stavesById', s.stavesById);
      methods.setValue('entriesById', s.entriesById);
      methods.setValue('connectorsById', s.connectorsById);
      methods.setValue('connectorOrder', s.connectorOrder);
      methods.setValue('tupletsById', s.tupletsById);
    },
    [methods]
  );

  const { record, undo, redo, canUndo, canRedo } = useUndoRedo(
    getStructure,
    setStructure
  );

  function addMeasure() {
    const s = getStructure();
    const newId = crypto.randomUUID();
    const lastMeasure =
      s.measuresById[s.measureOrder[s.measureOrder.length - 1]];
    if (!lastMeasure) {
      record({
        ...s,
        measureOrder: [...s.measureOrder, newId],
        measuresById: {
          ...s.measuresById,
          [newId]: { id: newId, staffIds: [] },
        },
      });
      return;
    }
    // Copying the staff structure from the last measure — same voice count,
    // each voice starts empty (never the previous measure's own entries).
    const newStaffEntries = lastMeasure.staffIds.map((sid) => {
      const newSid = crypto.randomUUID();
      const srcStaff = s.stavesById[sid];
      const emptyVoices = srcStaff.voiceOrder.map(() => createDefaultVoice());
      return {
        newSid,
        staff: {
          ...srcStaff,
          id: newSid,
          voiceOrder: emptyVoices.map((v) => v.id),
          voicesById: Object.fromEntries(emptyVoices.map((v) => [v.id, v])),
        },
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
  }

  function addStaff(measureId: string, staffType: StaffType) {
    const s = getStructure();
    const newSid = crypto.randomUUID();
    const voice = createDefaultVoice();
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
        [newSid]: {
          id: newSid,
          type: staffType,
          voiceOrder: [voice.id],
          voicesById: { [voice.id]: voice },
          group: null,
          groupId: null,
        },
      },
    });
  }

  function setStaffGroup(
    measureId: string,
    staffIds: string[],
    groupType: StaffGroupType | null
  ) {
    const s = getStructure();
    const measure = s.measuresById[measureId];

    // Clear group/groupId for any staff currently grouped with one of the
    // target staves, so reassigning a subset doesn't leave a stale partial
    // group behind.
    const idsToClear = new Set<string>();
    staffIds.forEach((id) => {
      findGroupMembers(measure.staffIds, s.stavesById, id).forEach((memberId) =>
        idsToClear.add(memberId)
      );
      idsToClear.add(id);
    });

    const stavesById = { ...s.stavesById };
    idsToClear.forEach((id) => {
      stavesById[id] = { ...stavesById[id], group: null, groupId: null };
    });

    if (groupType === 'grand') {
      // Implicit pairing: only the first (lowest-index) staff carries group="grand".
      const firstId = staffIds[0];
      stavesById[firstId] = {
        ...stavesById[firstId],
        group: 'grand',
        groupId: null,
      };
    } else if (groupType === 'bracket') {
      const newGroupId = crypto.randomUUID();
      staffIds.forEach((id) => {
        stavesById[id] = {
          ...stavesById[id],
          group: 'bracket',
          groupId: newGroupId,
        };
      });
    }

    record({ ...s, stavesById });
  }

  function addVoice(staffId: string) {
    record(addVoiceToStaff(getStructure(), staffId));
  }

  function removeVoice(staffId: string, voiceId: string) {
    record(removeVoiceFromStaff(getStructure(), staffId, voiceId));
  }

  function moveEntryToVoice(
    staffId: string,
    entryId: string,
    fromVoiceId: string,
    toVoiceId: string
  ) {
    const s = getStructure();
    const next = moveEntryToVoiceInStructure(
      s,
      staffId,
      entryId,
      fromVoiceId,
      toVoiceId
    );
    if (next !== s) {
      record(next);
    }
  }

  function addEntry(
    measureId: string,
    staffId: string,
    entry: DraftMusicEntry,
    voiceId?: string
  ) {
    const s = getStructure();
    const staff = s.stavesById[staffId];
    // A clef change is staff-wide but only ever authored in voice 1 (the
    // canonical timeline every other voice's position is judged against) —
    // enforced here regardless of which voice was passed in.
    const targetVoiceId =
      entry.type === 'clef'
        ? staff.voiceOrder[0]
        : voiceId ?? staff.voiceOrder[0];
    const targetVoice = staff.voicesById[targetVoiceId];
    const newEid = crypto.randomUUID();
    record({
      ...s,
      stavesById: {
        ...s.stavesById,
        [staffId]: {
          ...staff,
          voicesById: {
            ...staff.voicesById,
            [targetVoiceId]: {
              ...targetVoice,
              entryIds: [...targetVoice.entryIds, newEid],
            },
          },
        },
      },
      entriesById: {
        ...s.entriesById,
        [newEid]: { ...entry, id: newEid },
      },
    });
  }

  function updateEntry(entry: MusicEntry) {
    const s = getStructure();
    const next = applyEntryUpdate(s, entry);
    if (next !== s) {
      record(next);
    }
  }

  function reorderEntry(
    staffId: string,
    voiceId: string,
    entryId: string,
    toIndex: number
  ) {
    const s = getStructure();
    const next = moveEntryInVoice(s, staffId, voiceId, entryId, toIndex);
    if (next !== s) {
      record(next);
    }
  }

  // `family` scopes a clear (kind === null) to just tie/slur or just hairpins,
  // so removing the slur over a pair leaves its crescendo alone.
  function setConnector(
    startEntryId: string,
    endEntryId: string,
    kind: ConnectorKind | null,
    family: ConnectorKind[]
  ) {
    const s = getStructure();
    if (kind === null) {
      const existing = connectorBetween(s, startEntryId, endEntryId, family);
      if (!existing) {
        return;
      }
      record(removeConnector(s, existing.id));
      return;
    }
    record(upsertConnector(s, startEntryId, endEntryId, kind));
  }

  function setTuplet(entryIds: string[], ratio: TupletRatio | null) {
    record(setTupletInStructure(getStructure(), entryIds, ratio));
  }

  // A time signature change either re-bars the affected region (`rewrite`) — one
  // undo step covering the whole reflow — or applies "signature only", leaving
  // the notes as they are (now-overfull measures are flagged in the editor,
  // nothing is lost).
  function setCompositionTimeSignature(
    timeSig: TimeSignature,
    rewrite: boolean
  ) {
    const s = getStructure();
    const withTimeSignature = { ...s, timeSig };
    if (!rewrite) {
      record(withTimeSignature);
      return;
    }
    const { structure, rebarred } = rebar(withTimeSignature, 0);
    if (!rebarred) {
      window.alert(
        'Could not rewrite the music for this time signature — a staff has a different number of voices across the affected measures. No change was made.'
      );
      return;
    }
    record(structure);
  }

  function setMeasureTimeSignature(
    measureId: string,
    timeSig: TimeSignature | null,
    rewrite: boolean
  ) {
    const s = getStructure();
    const measure = s.measuresById[measureId];
    if (!measure) {
      return;
    }
    const withTimeSignature: CompositionStructure = {
      ...s,
      measuresById: {
        ...s.measuresById,
        [measureId]: { ...measure, time: timeSig },
      },
    };
    if (!rewrite) {
      record(withTimeSignature);
      return;
    }
    const measureIndex = s.measureOrder.indexOf(measureId);
    const { structure, rebarred } = rebar(withTimeSignature, measureIndex);
    if (!rebarred) {
      window.alert(
        'Could not rewrite the music for this time signature — a staff has a different number of voices across the affected measures. No change was made.'
      );
      return;
    }
    record(structure);
  }

  return (
    <CompositionFormSessionProvider
      getStructure={getStructure}
      recordStructure={record}
      onAddMeasure={addMeasure}
      onAddStaff={addStaff}
      onSetStaffGroup={setStaffGroup}
      onAddVoice={addVoice}
      onRemoveVoice={removeVoice}
      onMoveEntryToVoice={moveEntryToVoice}
      onAddEntry={addEntry}
      onUpdateEntry={updateEntry}
      onReorderEntry={reorderEntry}
      onSetConnector={setConnector}
      onSetTuplet={setTuplet}
      onSetCompositionTimeSignature={setCompositionTimeSignature}
      onSetMeasureTimeSignature={setMeasureTimeSignature}
    >
      <FormProvider {...methods}>
        <CompositionFormBody
          undo={undo}
          redo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
        />
      </FormProvider>
    </CompositionFormSessionProvider>
  );
}
