import '@one-step-at-a-time/web-components';
import type { TimeSignature } from '@one-step-at-a-time/web-components';
import { useFormContext } from 'react-hook-form';
import { AddChordInput } from './AddChordInput';
import { AddClefInput } from './AddClefInput';
import { AddNoteInput } from './AddNoteInput';
import { AddRestInput } from './AddRestInput';
import { AnchoredTabPanel } from './AnchoredTabPanel';
import { effectiveClefOfEntry } from './clefsHelpers';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import { serializeGrace } from './graceHelpers';
import { remainingDuration } from './measureCapacityHelpers';
import { resolveTupletRuns } from './tupletsHelpers';
import type {
  CompositionFormValues,
  DraftMusicEntry,
  MusicEntry,
} from './types';
import {
  useCompositionStructure,
  useConnectorAttributes,
} from './useCompositionStructure';
import { useEntryDrag } from './useEntryDrag';

interface StaffInputProps {
  staffId: string;
  measureId: string;
  timeSignature: TimeSignature;
}

export function StaffInput({
  staffId,
  measureId,
  timeSignature,
}: StaffInputProps) {
  const { watch } = useFormContext<CompositionFormValues>();
  const staff = watch(`stavesById.${staffId}`);
  const entriesById = watch('entriesById');
  const keySig = watch('keySig');
  const mode = watch('mode');
  const {
    session,
    selectStaff,
    selectEntry,
    registerStaffRef,
    registerEntryRef,
    addEntry,
  } = useCompositionFormSession();
  const connectorAttrs = useConnectorAttributes();
  const structure = useCompositionStructure();
  const { onEntryPointerDown } = useEntryDrag();

  const isSelected = session.selection.staffIds.includes(staffId);

  // The "Staff Entries" add-panel and overfull indicator stay scoped to
  // voice 1 this phase — every staff has exactly one voice until Phase 5
  // adds a way to create more, and a real target-voice selector is explicit
  // Phase 5 scope.
  const firstVoiceId = staff.voiceOrder[0];
  const entries = staff.voicesById[firstVoiceId].entryIds.map(
    (eid) => entriesById[eid]
  );

  const remainingBeats = remainingDuration(
    entries,
    timeSignature,
    structure.tupletsById
  );
  const add = (entry: DraftMusicEntry) => addEntry(measureId, staffId, entry);

  const staffClass = `cursor-pointer rounded transition-shadow ${
    isSelected ? 'rainbow-selected' : ''
  }`;

  const renderEntry = (voiceId: string, entry: MusicEntry) => {
    const isEntrySelected = session.selection.entryIds.includes(entry.id);
    const isDraggable = entry.type !== 'clef';
    const entryClass = `${isEntrySelected ? 'rainbow-selected' : ''} ${
      isDraggable ? 'cursor-grab' : ''
    }`.trim();
    const connector = connectorAttrs.get(entry.id);
    const handleEntryClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      selectEntry(measureId, staffId, entry.id, e);
    };
    const handleEntryPointerDown = (e: React.PointerEvent) => {
      onEntryPointerDown(e, {
        entry,
        staffId,
        voiceId,
        clef: effectiveClefOfEntry(structure, entry.id),
        entryIds: staff.voicesById[voiceId].entryIds,
      });
    };

    if (entry.type === 'note' || entry.type === 'chord') {
      const marks = {
        tie: connector?.tie,
        slur: connector?.slur,
        crescendo: connector?.crescendo,
        decrescendo: connector?.decrescendo,
        id: connector?.id,
        for: connector?.for,
        dynamic: entry.dynamic ?? undefined,
        articulation: entry.articulation ?? undefined,
        stress: entry.stress ?? undefined,
        ...serializeGrace(entry.grace),
        className: entryClass,
        onClick: handleEntryClick,
        onPointerDown: handleEntryPointerDown,
      };
      const setRef = (el: HTMLElement | null) => registerEntryRef(entry.id, el);

      if (entry.type === 'note') {
        return (
          <music-note
            key={entry.id}
            ref={setRef}
            note={entry.value}
            octave={entry.octave ?? undefined}
            duration={entry.duration}
            {...marks}
          />
        );
      }
      return (
        <music-chord
          key={entry.id}
          ref={setRef}
          duration={entry.duration}
          {...marks}
        >
          {entry.notes.map((n, j) => (
            <music-note key={j} note={n.value} octave={n.octave ?? undefined} />
          ))}
        </music-chord>
      );
    } else if (entry.type === 'clef') {
      return (
        <music-clef
          key={entry.id}
          ref={(el: HTMLElement | null) => registerEntryRef(entry.id, el)}
          clef={entry.clef}
          className={entryClass}
          onClick={handleEntryClick}
        />
      );
    } else {
      return (
        <music-rest
          key={entry.id}
          ref={(el: HTMLElement | null) => registerEntryRef(entry.id, el)}
          duration={entry.duration}
          className={entryClass}
          onClick={handleEntryClick}
          onPointerDown={handleEntryPointerDown}
        />
      );
    }
  };

  // A tuplet run renders as a <music-tuplet> wrapper (a direct child of
  // <music-voice>, as the library's slot walker requires); loose runs render
  // their entries inline. Each voice renders as its own <music-voice> —
  // wrapping even a single implicit voice this way is byte-identical to no
  // wrapper at all (the library's own direction/stem-policy resolution keys
  // off how many <music-voice> children exist, not whether the tag is
  // present), so this needs no rework once Phase 5 lets a staff carry 2-3.
  const voiceNodes = staff.voiceOrder.map((voiceId) => {
    const voice = staff.voicesById[voiceId];
    const runs = resolveTupletRuns(voice.entryIds, entriesById);
    const nodes = runs.map((run) => {
      const runNodes = run.entries.map((entry) => renderEntry(voiceId, entry));
      if (run.tupletId === null) {
        return runNodes;
      }
      const ratio = structure.tupletsById[run.tupletId]?.ratio;
      return (
        <music-tuplet key={run.tupletId} ratio={ratio}>
          {runNodes}
        </music-tuplet>
      );
    });
    return <music-voice key={voiceId}>{nodes}</music-voice>;
  });

  return (
    <>
      <music-staff
        ref={(el: HTMLElement | null) => registerStaffRef(staffId, el)}
        clef={staff.type === 'treble' ? 'treble' : 'bass'}
        group={staff.group ?? undefined}
        group-id={staff.groupId ?? undefined}
        className={staffClass}
        key-sig={keySig}
        mode={mode}
        time={timeSignature}
        onClick={(e) => selectStaff(measureId, staffId, e)}
      >
        {voiceNodes}
      </music-staff>
      {isSelected && (
        <AnchoredTabPanel
          tabs={[
            {
              label: 'Note',
              content: (
                <AddNoteInput onAdd={add} remainingBeats={remainingBeats} />
              ),
            },
            {
              label: 'Chord',
              content: (
                <AddChordInput onAdd={add} remainingBeats={remainingBeats} />
              ),
            },
            {
              label: 'Rest',
              content: (
                <AddRestInput onAdd={add} remainingBeats={remainingBeats} />
              ),
            },
            {
              label: 'Clef Change',
              content: <AddClefInput onAdd={add} />,
            },
          ]}
        />
      )}
    </>
  );
}
