'use client';

import '@rest-in-time/design-system';
import type {
  DurationType,
  Note,
  PitchChangeDetail,
} from '@rest-in-time/design-system';
import { useEffect, useRef, useState } from 'react';

type NoteItem = {
  id: string;
  type: 'note';
  value: Note;
  duration: DurationType;
};
type ChordItem = {
  id: string;
  type: 'chord';
  duration: DurationType;
  notes: Note[];
};
type StaffItem = NoteItem | ChordItem;

const initialNotes: StaffItem[] = [
  { id: 'c1', type: 'chord', duration: 'eighth', notes: ['A', 'E'] },
  { id: 'c2', type: 'chord', duration: 'eighth', notes: ['A', 'E'] },
  { id: 'n1', type: 'note', value: 'D', duration: 'quarter' },
  { id: 'n2', type: 'note', value: 'F#' as Note, duration: 'quarter' },
  { id: 'n3', type: 'note', value: 'B', duration: 'quarter' },
];

export default function MusicScore() {
  const staffRef = useRef<HTMLElement>(null);
  const [items, setItems] = useState<StaffItem[]>(initialNotes);

  useEffect(() => {
    const staff = staffRef.current;
    if (!staff) return;

    const onReorder = (e: Event) => {
      const { fromIndex, toIndex } = (e as CustomEvent).detail;

      setItems((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, moved);
        return next;
      });
    };

    const onPitchChange = (e: Event) => {
      const { elementIndex, chordNoteIndex, toNote } = (e as CustomEvent)
        .detail as PitchChangeDetail;
      // todo: fixing typings on web components. I want note and chord type to support Note and Octave
      const newValue = toNote as Note;

      setItems((prev) => {
        const next = [...prev];
        const item = next[elementIndex];
        if (item.type === 'chord' && chordNoteIndex !== null) {
          const updatedNotes = [...item.notes];
          updatedNotes[chordNoteIndex] = newValue;
          next[elementIndex] = { ...item, notes: updatedNotes };
        } else if (item.type === 'note') {
          next[elementIndex] = { ...item, value: newValue };
        }
        return next;
      });
    };

    staff.addEventListener('note-reorder', onReorder);
    staff.addEventListener('note-pitch-change', onPitchChange);
    return () => {
      staff.removeEventListener('note-reorder', onReorder);
      staff.removeEventListener('note-pitch-change', onPitchChange);
    };
  }, []);

  return (
    <music-composition keySig="D" mode="major" time="4/4">
      <music-measure>
        <music-staff-treble editable managed ref={staffRef}>
          {items.map((item) =>
            item.type === 'chord' ? (
              <music-chord key={item.id} duration={item.duration}>
                {item.notes.map((n, j) => (
                  <music-note key={j} value={n}></music-note>
                ))}
              </music-chord>
            ) : (
              <music-note
                key={item.id}
                value={item.value}
                duration={item.duration}
              ></music-note>
            )
          )}
        </music-staff-treble>
        <music-staff-bass>
          <music-note value="A" duration="quarter"></music-note>
        </music-staff-bass>
      </music-measure>
      <music-measure>
        <music-staff-treble>
          <music-note value="A" duration="thirtysecond"></music-note>
          <music-note value="D" duration="eighth"></music-note>
        </music-staff-treble>
        <music-staff-bass>
          <music-note value="A" duration="quarter"></music-note>
          <music-note value="A" duration="quarter"></music-note>
        </music-staff-bass>

        <music-staff-vocal voice="soprano">
          <music-note value={'C5' as Note} duration="eighth"></music-note>
          <music-note value={'D5' as Note} duration="eighth"></music-note>
          <music-note value={'E5' as Note} duration="eighth"></music-note>
          <music-note value={'F5' as Note} duration="eighth"></music-note>
          <music-note value={'G5' as Note} duration="eighth"></music-note>
          <music-note value={'A5' as Note} duration="eighth"></music-note>
          <music-note value={'A5' as Note} duration="quarter"></music-note>
          <music-lyrics verse="1">Hap-py birth-day to_ you you_</music-lyrics>
          <music-lyrics verse="2">
            Hap-py birth-day dear_ friend friend_
          </music-lyrics>
        </music-staff-vocal>
      </music-measure>
      <music-measure>
        <music-staff-treble>
          <music-note value="A" duration="quarter"></music-note>
          <music-note value="A" duration="quarter"></music-note>
          <music-note value="A" duration="quarter"></music-note>
          <music-note value="A" duration="quarter"></music-note>
        </music-staff-treble>
        <music-staff-bass>
          <music-note value="A" duration="quarter"></music-note>
        </music-staff-bass>
        <music-staff-guitar-tab></music-staff-guitar-tab>
      </music-measure>
    </music-composition>
  );
}
