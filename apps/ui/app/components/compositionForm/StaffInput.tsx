import { Select } from '@/design-system';
import '@one-step-at-a-time/web-components';
import type { TimeSignature } from '@one-step-at-a-time/web-components';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import { AddBarlineInput } from './AddBarlineInput';
import { AddChordInput } from './AddChordInput';
import { AddClefInput } from './AddClefInput';
import { AddNoteInput } from './AddNoteInput';
import { AddRestInput } from './AddRestInput';
import { effectiveClefOfEntry } from './clefsHelpers';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import { DockedTabPanel } from './DockedTabPanel';
import type { WrapperRun } from './entryWrappersHelpers';
import { resolveVoiceRuns, resolveWrapperRuns } from './entryWrappersHelpers';
import { serializeGrace } from './graceHelpers';
import { AddGuitarNoteInput } from './GuitarNoteInput';
import { LyricsInput } from './LyricsInput';
import {
  serializeChordTone,
  serializeLaissezVibrer,
  serializeMarkings,
} from './markingsHelpers';
import { remainingDuration } from './measureCapacityHelpers';
import { StaffSettingsInput } from './StaffSettingsInput';
import type {
  CompositionFormValues,
  DraftMusicEntry,
  MusicEntry,
} from './types';
import { isTimedEntry } from './types';
import {
  useCompositionStructure,
  useConnectorAttributes,
  useOctaveAttributes,
} from './useCompositionStructure';
import { useEntryDrag } from './useEntryDrag';
import { VoiceInput } from './VoiceInput';

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
  const octaveAttrs = useOctaveAttributes();
  const structure = useCompositionStructure();
  const { onEntryPointerDown } = useEntryDrag();

  const isSelected = session.selection.staffIds.includes(staffId);

  // Which voice the "Staff Entries" add-panel targets. Plain local state —
  // nothing else needs this value, and StaffInput already remounts per staff
  // via the parent's own .map, so it's naturally staff-scoped. Falls back to
  // voice 1 if the stored id no longer exists (its voice was removed).
  const [targetVoiceId, setTargetVoiceId] = useState(staff.voiceOrder[0]);
  const effectiveTargetVoiceId = staff.voicesById[targetVoiceId]
    ? targetVoiceId
    : staff.voiceOrder[0];

  const entries = staff.voicesById[effectiveTargetVoiceId].entryIds.map(
    (eid) => entriesById[eid]
  );

  const remainingBeats = remainingDuration(entries, timeSignature, structure);
  const add = (entry: DraftMusicEntry) =>
    addEntry(measureId, staffId, entry, effectiveTargetVoiceId);

  // Hidden entirely for the common single-voice case — no added friction.
  const voiceSelector =
    staff.voiceOrder.length > 1 ? (
      <label className="flex items-center gap-2 px-3 pt-2 text-xs font-medium text-zinc-500">
        Voice
        <Select
          value={effectiveTargetVoiceId}
          onChange={(e) => setTargetVoiceId(e.target.value)}
        >
          {staff.voiceOrder.map((voiceId, index) => (
            <option key={voiceId} value={voiceId}>
              Voice {index + 1}
            </option>
          ))}
        </Select>
      </label>
    ) : null;

  // The library honours one barline per gap between notes, and a barline at
  // a bar's start or end is the measure's own (its Repeats tab).
  const voice1EntryIds = staff.voicesById[staff.voiceOrder[0]].entryIds;
  const lastVoice1Entry =
    entriesById[voice1EntryIds[voice1EntryIds.length - 1]];
  const barlineBlockedReason =
    lastVoice1Entry === undefined
      ? 'Add a note first — a barline at the start of a bar is set on the measure (Repeats tab).'
      : lastVoice1Entry.type === 'barline'
      ? 'Voice 1 already ends with a barline.'
      : null;

  const staffClass = `cursor-pointer rounded transition-shadow ${
    isSelected ? 'rainbow-selected' : ''
  }`;

  const renderEntry = (voiceId: string, entry: MusicEntry) => {
    const isEntrySelected = session.selection.entryIds.includes(entry.id);
    const isDraggable = isTimedEntry(entry);
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
      const letRing = serializeLaissezVibrer(entry);
      const marks = {
        tie: connector?.tie ?? letRing.tie,
        'lv-label': letRing['lv-label'],
        'tie-style': connector?.['tie-style'] ?? letRing['tie-style'],
        slur: connector?.slur,
        glissando: connector?.glissando,
        'glissando-hint': connector?.['glissando-hint'],
        crescendo: connector?.crescendo,
        decrescendo: connector?.decrescendo,
        for: connector?.for,
        dynamic: entry.dynamic ?? undefined,
        'dynamic-shared': entry.dynamicShared || undefined,
        'stem-direction': entry.stemDirection ?? undefined,
        'beam-group': entry.beamGroupId ?? undefined,
        'shared-stem-for': entry.sharedStemWithEntryId ?? undefined,
        'slur-group': entry.slurGroupId ?? undefined,
        ...octaveAttrs.get(entry.id),
        articulation: entry.articulation ?? undefined,
        stress: entry.stress ?? undefined,
        ...serializeGrace(entry.grace),
        ...serializeMarkings(entry),
        className: entryClass,
        onClick: handleEntryClick,
        onPointerDown: handleEntryPointerDown,
      };
      const setRef = (el: HTMLElement | null) => registerEntryRef(entry.id, el);

      if (entry.type === 'note') {
        return (
          <music-note
            key={entry.id}
            id={entry.id}
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
          id={entry.id}
          ref={setRef}
          duration={entry.duration}
          {...marks}
        >
          {entry.notes.map((n, j) => (
            <music-note
              key={j}
              note={n.value}
              octave={n.octave ?? undefined}
              {...serializeChordTone(n)}
            />
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
    } else if (entry.type === 'guitar-note') {
      return (
        <music-guitar-note
          key={entry.id}
          id={entry.id}
          ref={(el: HTMLElement | null) => registerEntryRef(entry.id, el)}
          fret={entry.fret}
          string={entry.string}
          duration={entry.duration}
          tie={connector?.tie}
          slur={connector?.slur}
          hammer-on={connector?.['hammer-on']}
          pull-off={connector?.['pull-off']}
          slide={connector?.slide}
          className={entryClass}
          onClick={handleEntryClick}
          onPointerDown={handleEntryPointerDown}
        />
      );
    } else if (entry.type === 'barline') {
      return (
        <music-barline
          key={entry.id}
          ref={(el: HTMLElement | null) => registerEntryRef(entry.id, el)}
          type={entry.barlineType}
          className={entryClass}
          onClick={handleEntryClick}
        />
      );
    } else {
      return (
        <music-rest
          key={entry.id}
          id={entry.id}
          ref={(el: HTMLElement | null) => registerEntryRef(entry.id, el)}
          duration={entry.duration}
          hidden={entry.hidden || undefined}
          beam-group={entry.beamGroupId ?? undefined}
          rest-staff-side={entry.restStaffSide ?? undefined}
          className={entryClass}
          onClick={handleEntryClick}
          onPointerDown={handleEntryPointerDown}
        />
      );
    }
  };

  // A tremolo or written-out arpeggio renders as its wrapper element around
  // its members; anything else renders its entries inline.
  const renderWrapper = (wrapper: WrapperRun, children: React.ReactNode[]) => {
    if (wrapper.kind === 'tremolo' && wrapper.id) {
      const tremolo = structure.tremolosById[wrapper.id];
      return (
        <music-tremolo
          key={wrapper.id}
          strokes={tremolo?.strokes}
          beam-attach={tremolo?.beamAttach ?? undefined}
          beam-position={tremolo?.beamPosition ?? undefined}
          tremolo-group={tremolo?.crossStaffGroupId ?? undefined}
        >
          {children}
        </music-tremolo>
      );
    }
    if (wrapper.kind === 'arpeggio' && wrapper.id) {
      const arpeggio = structure.arpeggiosById[wrapper.id];
      return (
        <music-arpeggio
          key={wrapper.id}
          unmatched={arpeggio?.unmatched ?? undefined}
          lv-label={arpeggio?.lvLabel || undefined}
        >
          {children}
        </music-arpeggio>
      );
    }
    return children;
  };

  // A tuplet run renders as a <music-tuplet> wrapper (a direct child of
  // <music-voice>, as the library's slot walker requires); loose runs render
  // their entries inline. Each voice renders as its own <music-voice>; a
  // single wrapped voice renders the same as no wrapper.
  const voiceNodes = staff.voiceOrder.map((voiceId) => {
    const voice = staff.voicesById[voiceId];
    const runs = resolveVoiceRuns(voice.entryIds, entriesById);
    const nodes = runs.map((run) => {
      const runNodes = resolveWrapperRuns(
        run.entries,
        structure.arpeggiosById
      ).map((wrapper) =>
        renderWrapper(
          wrapper,
          wrapper.entries.map((entry) => renderEntry(voiceId, entry))
        )
      );
      if (run.tupletId === null) {
        return runNodes;
      }
      const tuplet = structure.tupletsById[run.tupletId];
      return (
        <music-tuplet
          key={run.tupletId}
          ratio={tuplet?.ratio}
          placement={tuplet?.placement ?? undefined}
          tuplet-group={tuplet?.crossStaffGroupId ?? undefined}
        >
          {runNodes}
        </music-tuplet>
      );
    });
    return <music-voice key={voiceId}>{nodes}</music-voice>;
  });

  const sharedStaffAttributes = {
    group: staff.group ?? undefined,
    'group-id': staff.groupId ?? undefined,
    label: staff.label ?? undefined,
    part: staff.part ?? undefined,
    className: staffClass,
    'key-sig': keySig,
    mode,
    time: timeSignature,
    onClick: (e: React.MouseEvent) => selectStaff(measureId, staffId, e),
  };

  return (
    <>
      {staff.type === 'guitar-tab' ? (
        // Tab reads its notes directly: no voice wrappers.
        <music-staff-guitar-tab
          ref={(el: HTMLElement | null) => registerStaffRef(staffId, el)}
          tab-for={staff.tabFor ?? undefined}
          group={sharedStaffAttributes.group}
          group-id={sharedStaffAttributes['group-id']}
          label={sharedStaffAttributes.label}
          part={sharedStaffAttributes.part}
          className={staffClass}
          time={timeSignature}
          onClick={sharedStaffAttributes.onClick}
        >
          {staff.voicesById[staff.voiceOrder[0]].entryIds.map((id) =>
            entriesById[id]
              ? renderEntry(staff.voiceOrder[0], entriesById[id])
              : null
          )}
        </music-staff-guitar-tab>
      ) : staff.type === 'vocal' ? (
        <music-staff-vocal
          ref={(el: HTMLElement | null) => registerStaffRef(staffId, el)}
          voice={staff.voiceType}
          {...sharedStaffAttributes}
        >
          {voiceNodes}
          {(staff.lyrics ?? []).map((verse) => (
            <music-lyrics key={verse.verse} verse={String(verse.verse)}>
              {verse.text}
            </music-lyrics>
          ))}
        </music-staff-vocal>
      ) : (
        <music-staff
          ref={(el: HTMLElement | null) => registerStaffRef(staffId, el)}
          clef={staff.type === 'bass' ? 'bass' : 'treble'}
          {...sharedStaffAttributes}
        >
          {voiceNodes}
        </music-staff>
      )}
      {isSelected && staff.type === 'guitar-tab' && (
        <DockedTabPanel
          tabs={[
            {
              label: 'Tab Note',
              content: (
                <AddGuitarNoteInput
                  onAdd={add}
                  remainingBeats={remainingBeats}
                />
              ),
            },
            {
              label: 'Staff',
              content: <StaffSettingsInput staffId={staffId} />,
            },
          ]}
        />
      )}
      {isSelected && staff.type !== 'guitar-tab' && (
        <DockedTabPanel
          tabs={[
            {
              label: 'Note',
              content: (
                <>
                  {voiceSelector}
                  <AddNoteInput onAdd={add} remainingBeats={remainingBeats} />
                </>
              ),
            },
            {
              label: 'Chord',
              content: (
                <>
                  {voiceSelector}
                  <AddChordInput onAdd={add} remainingBeats={remainingBeats} />
                </>
              ),
            },
            {
              label: 'Rest',
              content: (
                <>
                  {voiceSelector}
                  <AddRestInput onAdd={add} remainingBeats={remainingBeats} />
                </>
              ),
            },
            // A vocal staff's clef follows its voice type, so it takes no
            // clef changes.
            ...(staff.type === 'vocal'
              ? [
                  {
                    label: 'Lyrics',
                    content: (
                      <LyricsInput staff={staff} structure={structure} />
                    ),
                  },
                ]
              : [
                  {
                    // No voice selector here — a clef change always targets
                    // voice 1 regardless (addEntry enforces this; a clef
                    // change is staff-wide, not voice-scoped), so a selector
                    // would mislead.
                    label: 'Clef Change',
                    content: <AddClefInput onAdd={add} />,
                  },
                ]),
            {
              // Like a clef change: staff-wide, always in voice 1.
              label: 'Barline',
              content: (
                <AddBarlineInput
                  onAdd={add}
                  blockedReason={barlineBlockedReason}
                />
              ),
            },
            {
              label: 'Voices',
              content: <VoiceInput staffId={staffId} />,
            },
            {
              label: 'Staff',
              content: <StaffSettingsInput staffId={staffId} />,
            },
          ]}
        />
      )}
    </>
  );
}
