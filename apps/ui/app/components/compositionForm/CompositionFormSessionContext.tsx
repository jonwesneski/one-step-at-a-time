import type {
  StaffGroupType,
  TimeSignature,
  TupletRatio,
} from '@one-step-at-a-time/web-components';
import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from 'react';
import { removeSelectionFromStructure } from './deleteSelectionHelpers';
import { computeBoxSelection } from './selectionHelpers';
import type {
  CompositionStructure,
  ConnectorKind,
  DraftMusicEntry,
  MusicEntry,
  Selection,
  StaffType,
} from './types';
import { EMPTY_SELECTION, isSelectionEmpty } from './types';

// A time signature change the user picked but hasn't confirmed — the
// TimeSignatureChangeDialog is open on it, asking rewrite / signature-only /
// cancel.
export type PendingTimeSignatureChange =
  | { scope: 'composition'; timeSig: TimeSignature }
  | { scope: 'measure'; measureId: string; timeSig: TimeSignature | null };

export type CompositionFormSession = {
  entryPanelTab: string | null;
  selection: Selection;
  pendingTimeSignatureChange: PendingTimeSignatureChange | null;
};

type CompositionFormSessionContextValue = {
  session: CompositionFormSession;
  setSession: (patch: Partial<CompositionFormSession>) => void;
  registerMeasureRef: (id: string, el: HTMLElement | null) => void;
  registerStaffRef: (id: string, el: HTMLElement | null) => void;
  registerEntryRef: (id: string, el: HTMLElement | null) => void;
  // The live DOM elements behind the id maps, for hit-testing and geometry
  // (marquee select, note drag). Same Map instances for the provider's lifetime.
  staffElements: Map<string, HTMLElement>;
  entryElements: Map<string, HTMLElement>;
  selectMeasure: (measureId: string) => void;
  selectStaff: (
    measureId: string,
    staffId: string,
    e: React.MouseEvent
  ) => void;
  selectEntry: (
    measureId: string,
    staffId: string,
    entryId: string,
    e: React.MouseEvent
  ) => void;
  applyDragSelection: (
    dragRect: DOMRect,
    structure: Pick<
      CompositionStructure,
      'measureOrder' | 'measuresById' | 'stavesById'
    >
  ) => void;
  deleteSelected: () => void;
  addMeasure: () => void;
  addStaff: (measureId: string, staffType: StaffType) => void;
  setStaffGroup: (
    measureId: string,
    staffIds: string[],
    groupType: StaffGroupType | null
  ) => void;
  addVoice: (staffId: string) => void;
  removeVoice: (staffId: string, voiceId: string) => void;
  moveEntryToVoice: (
    staffId: string,
    entryId: string,
    fromVoiceId: string,
    toVoiceId: string
  ) => void;
  addEntry: (
    measureId: string,
    staffId: string,
    entry: DraftMusicEntry,
    voiceId?: string
  ) => void;
  updateEntry: (entry: MusicEntry) => void;
  reorderEntry: (
    staffId: string,
    voiceId: string,
    entryId: string,
    toIndex: number
  ) => void;
  setConnector: (
    startEntryId: string,
    endEntryId: string,
    kind: ConnectorKind | null,
    family: ConnectorKind[]
  ) => void;
  setTuplet: (entryIds: string[], ratio: TupletRatio | null) => void;
  requestTimeSignatureChange: (request: PendingTimeSignatureChange) => void;
  confirmTimeSignatureChange: (rewrite: boolean) => void;
  cancelTimeSignatureChange: () => void;
};

const CompositionFormSessionContext =
  createContext<CompositionFormSessionContextValue | null>(null);

type CompositionFormSessionProviderProps = {
  getStructure: () => CompositionStructure;
  recordStructure: (structure: CompositionStructure) => void;
  onAddMeasure: () => void;
  onAddStaff: (measureId: string, staffType: StaffType) => void;
  onSetStaffGroup: (
    measureId: string,
    staffIds: string[],
    groupType: StaffGroupType | null
  ) => void;
  onAddVoice: (staffId: string) => void;
  onRemoveVoice: (staffId: string, voiceId: string) => void;
  onMoveEntryToVoice: (
    staffId: string,
    entryId: string,
    fromVoiceId: string,
    toVoiceId: string
  ) => void;
  onAddEntry: (
    measureId: string,
    staffId: string,
    entry: DraftMusicEntry,
    voiceId?: string
  ) => void;
  onUpdateEntry: (entry: MusicEntry) => void;
  onReorderEntry: (
    staffId: string,
    voiceId: string,
    entryId: string,
    toIndex: number
  ) => void;
  onSetConnector: (
    startEntryId: string,
    endEntryId: string,
    kind: ConnectorKind | null,
    family: ConnectorKind[]
  ) => void;
  onSetTuplet: (entryIds: string[], ratio: TupletRatio | null) => void;
  onSetCompositionTimeSignature: (
    timeSig: TimeSignature,
    rewrite: boolean
  ) => void;
  onSetMeasureTimeSignature: (
    measureId: string,
    timeSig: TimeSignature | null,
    rewrite: boolean
  ) => void;
  children: React.ReactNode;
};

// For state that is shared across the composition form, but NOT submitted
export function CompositionFormSessionProvider({
  getStructure,
  recordStructure,
  onAddMeasure,
  onAddStaff,
  onSetStaffGroup,
  onAddVoice,
  onRemoveVoice,
  onMoveEntryToVoice,
  onAddEntry,
  onUpdateEntry,
  onReorderEntry,
  onSetConnector,
  onSetTuplet,
  onSetCompositionTimeSignature,
  onSetMeasureTimeSignature,
  children,
}: CompositionFormSessionProviderProps) {
  const [session, setSessionState] = useState<CompositionFormSession>({
    entryPanelTab: null,
    selection: EMPTY_SELECTION,
    pendingTimeSignatureChange: null,
  });
  const setSession = useCallback(
    (patch: Partial<CompositionFormSession>) =>
      setSessionState((prev) => ({ ...prev, ...patch })),
    []
  );

  const measureRefs = useRef(new Map<string, HTMLElement>());
  const staffRefs = useRef(new Map<string, HTMLElement>());
  const entryRefs = useRef(new Map<string, HTMLElement>());

  const registerMeasureRef = useCallback(
    (id: string, el: HTMLElement | null) => {
      if (el) measureRefs.current.set(id, el);
      else measureRefs.current.delete(id);
    },
    []
  );
  const registerStaffRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) staffRefs.current.set(id, el);
    else staffRefs.current.delete(id);
  }, []);
  const registerEntryRef = useCallback((id: string, el: HTMLElement | null) => {
    if (el) entryRefs.current.set(id, el);
    else entryRefs.current.delete(id);
  }, []);

  const selectMeasure = useCallback(
    (measureId: string) => {
      setSession({
        selection: { measureIds: [measureId], staffIds: [], entryIds: [] },
      });
    },
    [setSession]
  );

  const selectStaff = useCallback(
    (measureId: string, staffId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      setSession({
        selection: { measureIds: [], staffIds: [staffId], entryIds: [] },
      });
    },
    [setSession]
  );

  const selectEntry = useCallback(
    (
      measureId: string,
      staffId: string,
      entryId: string,
      e: React.MouseEvent
    ) => {
      e.stopPropagation();
      const additive = e.shiftKey || e.metaKey || e.ctrlKey;
      setSessionState((prev) => {
        if (!additive) {
          return {
            ...prev,
            selection: { measureIds: [], staffIds: [], entryIds: [entryId] },
          };
        }
        const alreadySelected = prev.selection.entryIds.includes(entryId);
        return {
          ...prev,
          selection: {
            measureIds: [],
            staffIds: [],
            entryIds: alreadySelected
              ? prev.selection.entryIds.filter((id) => id !== entryId)
              : [...prev.selection.entryIds, entryId],
          },
        };
      });
    },
    []
  );

  const applyDragSelection = useCallback(
    (
      dragRect: DOMRect,
      structure: Pick<
        CompositionStructure,
        'measureOrder' | 'measuresById' | 'stavesById'
      >
    ) => {
      const selection = computeBoxSelection(dragRect, structure, {
        measures: measureRefs.current,
        staves: staffRefs.current,
        entries: entryRefs.current,
      });
      setSession({ selection });
    },
    [setSession]
  );

  const deleteSelected = useCallback(() => {
    if (isSelectionEmpty(session.selection)) return;
    recordStructure(
      removeSelectionFromStructure(getStructure(), session.selection)
    );
    setSession({ selection: EMPTY_SELECTION });
  }, [session.selection, getStructure, recordStructure, setSession]);

  // Removing a voice deletes its own entries outright (unlike reorder/move,
  // which never delete anything) — drop any now-dangling id from the
  // selection afterward, mirroring confirmTimeSignatureChange's own
  // "mutation can invalidate the selection" handling below.
  const removeVoice = useCallback(
    (staffId: string, voiceId: string) => {
      onRemoveVoice(staffId, voiceId);
      const nextEntriesById = getStructure().entriesById;
      setSessionState((prev) => {
        const entryIds = prev.selection.entryIds.filter(
          (id) => nextEntriesById[id] !== undefined
        );
        return entryIds.length === prev.selection.entryIds.length
          ? prev
          : { ...prev, selection: { ...prev.selection, entryIds } };
      });
    },
    [onRemoveVoice, getStructure]
  );

  const requestTimeSignatureChange = useCallback(
    (request: PendingTimeSignatureChange) =>
      setSession({ pendingTimeSignatureChange: request }),
    [setSession]
  );
  const cancelTimeSignatureChange = useCallback(
    () => setSession({ pendingTimeSignatureChange: null }),
    [setSession]
  );
  const confirmTimeSignatureChange = useCallback(
    (rewrite: boolean) => {
      const pending = session.pendingTimeSignatureChange;
      if (!pending) {
        return;
      }
      if (pending.scope === 'composition') {
        onSetCompositionTimeSignature(pending.timeSig, rewrite);
      } else {
        onSetMeasureTimeSignature(pending.measureId, pending.timeSig, rewrite);
      }
      setSession({
        pendingTimeSignatureChange: null,
        // rebar mints fresh measure/staff ids
        ...(rewrite ? { selection: EMPTY_SELECTION } : {}),
      });
    },
    [
      session.pendingTimeSignatureChange,
      onSetCompositionTimeSignature,
      onSetMeasureTimeSignature,
      setSession,
    ]
  );

  return (
    <CompositionFormSessionContext
      value={{
        session,
        setSession,
        registerMeasureRef,
        registerStaffRef,
        registerEntryRef,
        staffElements: staffRefs.current,
        entryElements: entryRefs.current,
        selectMeasure,
        selectStaff,
        selectEntry,
        applyDragSelection,
        deleteSelected,
        addMeasure: onAddMeasure,
        addStaff: onAddStaff,
        setStaffGroup: onSetStaffGroup,
        addVoice: onAddVoice,
        removeVoice,
        moveEntryToVoice: onMoveEntryToVoice,
        addEntry: onAddEntry,
        updateEntry: onUpdateEntry,
        reorderEntry: onReorderEntry,
        setConnector: onSetConnector,
        setTuplet: onSetTuplet,
        requestTimeSignatureChange,
        confirmTimeSignatureChange,
        cancelTimeSignatureChange,
      }}
    >
      {children}
    </CompositionFormSessionContext>
  );
}

export function useCompositionFormSession() {
  const ctx = useContext(CompositionFormSessionContext);
  if (!ctx)
    throw new Error(
      `${useCompositionFormSession.name} must be used within ${CompositionFormSessionProvider.name}`
    );
  return ctx;
}
