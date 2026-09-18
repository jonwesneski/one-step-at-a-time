import '@one-step-at-a-time/web-components';
import { useFormContext } from 'react-hook-form';
import { AnchoredTabPanel } from './AnchoredTabPanel';
import { ClefEntryInput } from './ClefEntryInput';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import { ConnectorInput } from './ConnectorInput';
import { isConnectableSelection } from './connectorsHelpers';
import { EntryEditInput } from './EntryEditInput';
import { GraceInput } from './GraceInput';
import { MeasureBasicInput } from './MeasureBasicInput';
import {
  availableForDuration,
  fittingDurations,
  remainingDuration,
} from './measureCapacityHelpers';
import { StaffGroupInput } from './StaffGroupInput';
import { StaffInput } from './StaffInput';
import { TupletInput } from './TupletInput';
import { tupletCandidate } from './tupletsHelpers';
import type { CompositionFormValues } from './types';
import { isSingleEntrySelection } from './types';
import {
  useCompositionStructure,
  useMeasureTimeSignatures,
} from './useCompositionStructure';
import { staffEntryIds } from './voiceHelpers';

interface MeasureInputProps {
  measureId: string;
}

export function MeasureInput({ measureId }: MeasureInputProps) {
  const { watch } = useFormContext<CompositionFormValues>();
  const measure = watch(`measuresById.${measureId}`);
  const { session, selectMeasure, registerMeasureRef, setConnector } =
    useCompositionFormSession();
  const structure = useCompositionStructure();
  const timeSignature =
    useMeasureTimeSignatures().get(measureId) ?? structure.timeSig;

  const isMeasureSelected = session.selection.measureIds.includes(measureId);
  // Overfull is checked per voice, not per staff — each voice has its own
  // independent capacity budget (see measureCapacityHelpers.ts), so summing
  // across voices before comparing would wrongly flag a staff whose voices
  // each individually fit. This still can't happen with today's UI (every
  // staff has exactly one voice), but stays correct once Phase 5 adds more.
  const isOverfull = measure.staffIds.some((sid) => {
    const staff = structure.stavesById[sid];
    return staff?.voiceOrder.some(
      (voiceId) =>
        remainingDuration(
          staff.voicesById[voiceId].entryIds.map(
            (id) => structure.entriesById[id]
          ),
          timeSignature,
          structure.tupletsById
        ) < -1e-9
    );
  });
  const containsSelectedStaff = measure.staffIds.some((id) =>
    session.selection.staffIds.includes(id)
  );

  const selectedStaffIdsInMeasure = measure.staffIds.filter((id) =>
    session.selection.staffIds.includes(id)
  );
  const isGroupableSelection =
    selectedStaffIdsInMeasure.length === session.selection.staffIds.length &&
    selectedStaffIdsInMeasure.length >= 2;

  // A tie/slur editor is shown by the measure that holds the selection's start
  // endpoint, so a cross-barline selection gets exactly one panel.
  const selectionEndpoints = isConnectableSelection(
    session.selection,
    structure
  );
  const connectorEndpoints =
    selectionEndpoints &&
    measure.staffIds.some((sid) => {
      const staff = structure.stavesById[sid];
      return (
        staff !== undefined &&
        staffEntryIds(staff).includes(selectionEndpoints.startEntryId)
      );
    })
      ? selectionEndpoints
      : null;

  // The edit panel shows for a lone selected entry, mounted by the measure that
  // actually contains it (mirrors how the connector panel binds to its start).
  const selectedEntryId = isSingleEntrySelection(session.selection)
    ? session.selection.entryIds[0]
    : null;
  const editableEntry =
    selectedEntryId &&
    measure.staffIds.some((sid) => {
      const staff = structure.stavesById[sid];
      return (
        staff !== undefined && staffEntryIds(staff).includes(selectedEntryId)
      );
    })
      ? structure.entriesById[selectedEntryId]
      : null;

  // A tuplet groups entries within one staff — offered by the measure holding
  // that staff.
  const tupletTarget = tupletCandidate(session.selection, structure);
  const showTuplet =
    tupletTarget !== null && measure.staffIds.includes(tupletTarget.staffId);

  const tabs = [];
  if (isMeasureSelected) {
    tabs.push({
      label: 'Measure',
      content: (
        <MeasureBasicInput
          measureId={measureId}
          measure={measure}
          timeSignature={timeSignature}
          isFirstMeasure={structure.measureOrder[0] === measureId}
        />
      ),
    });
  }
  if (isGroupableSelection) {
    tabs.push({
      label: 'Group Staves',
      content: (
        <StaffGroupInput
          measureId={measureId}
          staffIds={selectedStaffIdsInMeasure}
        />
      ),
    });
  }
  if (connectorEndpoints) {
    tabs.push({
      label: 'Connections',
      content: (
        <ConnectorInput
          endpoints={connectorEndpoints}
          selectionEntryCount={session.selection.entryIds.length}
          structure={structure}
          onSetConnector={setConnector}
        />
      ),
    });
  }
  if (editableEntry?.type === 'clef') {
    tabs.push({
      label: 'Clef',
      content: <ClefEntryInput entry={editableEntry} />,
    });
  } else if (editableEntry) {
    tabs.push({
      label: 'Edit',
      content: (
        <EntryEditInput
          entry={editableEntry}
          durationOptions={fittingDurations(
            availableForDuration(structure, timeSignature, editableEntry.id),
            editableEntry.duration
          )}
        />
      ),
    });
    if (editableEntry.type !== 'rest') {
      tabs.push({
        label: 'Grace',
        content: <GraceInput entry={editableEntry} />,
      });
    }
  }
  if (showTuplet) {
    tabs.push({
      label: 'Tuplet',
      content: <TupletInput structure={structure} />,
    });
  }

  return (
    <music-measure
      ref={(el: HTMLElement | null) => registerMeasureRef(measureId, el)}
      className={`cursor-pointer rounded transition-shadow ${
        isMeasureSelected ? 'rainbow-selected' : ''
      } ${isOverfull ? 'outline-2 outline-red-500' : ''} ${
        isMeasureSelected ||
        containsSelectedStaff ||
        connectorEndpoints ||
        editableEntry ||
        showTuplet
          ? 'pb-10'
          : ''
      }`}
      onClick={() => selectMeasure(measureId)}
    >
      {isOverfull && (
        <div className="text-red-600 text-xs px-2 pt-1 select-none">
          More notes than fit this time signature — trailing notes are hidden.
        </div>
      )}
      {measure.staffIds.length === 0 && (
        <div className="text-zinc-400 text-sm px-3 py-4 select-none">
          Tap or click here and use the dropdown to add a staff
        </div>
      )}
      {measure.staffIds.map((staffId) => (
        <StaffInput
          key={staffId}
          staffId={staffId}
          measureId={measureId}
          timeSignature={timeSignature}
        />
      ))}
      {tabs.length > 0 && <AnchoredTabPanel tabs={tabs} />}
    </music-measure>
  );
}
