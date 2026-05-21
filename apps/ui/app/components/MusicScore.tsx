import '@one-step-at-a-time/web-components';
import type {
  DurationType,
  LetterNote,
  PitchChangeDetail,
} from '@one-step-at-a-time/web-components';
import { useEffect, useRef, useState } from 'react';

type LetterNoteItem = {
  id: string;
  type: 'note';
  value: LetterNote;
  duration: DurationType;
};
type ChordItem = {
  id: string;
  type: 'chord';
  duration: DurationType;
  notes: LetterNote[];
};
type StaffItem = LetterNoteItem | ChordItem;

const initialLetterNotes: StaffItem[] = [
  { id: 'c1', type: 'chord', duration: 'eighth', notes: ['A', 'E'] },
  { id: 'c2', type: 'chord', duration: 'eighth', notes: ['A', 'E'] },
  { id: 'n1', type: 'note', value: 'D', duration: 'quarter' },
  { id: 'n2', type: 'note', value: 'F#' as LetterNote, duration: 'quarter' },
  { id: 'n3', type: 'note', value: 'B', duration: 'quarter' },
];

export default function MusicScore() {
  const staffRef = useRef<HTMLElement>(null);
  const [items, setItems] = useState<StaffItem[]>(initialLetterNotes);

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
      // todo: fixing typings on web components. I want note and chord type to support LetterNote and Octave
      const newValue = toNote as LetterNote;

      setItems((prev) => {
        const next = [...prev];
        const item = next[elementIndex];
        if (item.type === 'chord' && chordNoteIndex !== null) {
          const updatedLetterNotes = [...item.notes];
          updatedLetterNotes[chordNoteIndex] = newValue;
          next[elementIndex] = { ...item, notes: updatedLetterNotes };
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
                  <music-note key={j} note={n}></music-note>
                ))}
              </music-chord>
            ) : (
              <music-note
                key={item.id}
                note={item.value}
                duration={item.duration}
              ></music-note>
            )
          )}
        </music-staff-treble>
        <music-staff-bass>
          <music-note note="A" duration="quarter"></music-note>
        </music-staff-bass>
        <music-staff-vocal></music-staff-vocal>
      </music-measure>
      <music-measure>
        <music-staff-treble>
          <music-note note="A" duration="thirtysecond"></music-note>
          <music-note note="D" duration="eighth"></music-note>
        </music-staff-treble>
        <music-staff-bass>
          <music-note note="A" duration="quarter"></music-note>
          <music-note note="A" duration="quarter"></music-note>
        </music-staff-bass>

        <music-staff-vocal voice="soprano">
          <music-note note={'C5' as LetterNote} duration="eighth"></music-note>
          <music-note note={'D5' as LetterNote} duration="eighth"></music-note>
          <music-note note={'E5' as LetterNote} duration="eighth"></music-note>
          <music-note note={'F5' as LetterNote} duration="eighth"></music-note>
          <music-note note={'G5' as LetterNote} duration="eighth"></music-note>
          <music-note note={'A5' as LetterNote} duration="eighth"></music-note>
          <music-note note={'A5' as LetterNote} duration="quarter"></music-note>
          <music-lyrics verse="1">Hap-py birth-day to_ you you_</music-lyrics>
          <music-lyrics verse="2">
            Hap-py birth-day dear_ friend friend_
          </music-lyrics>
        </music-staff-vocal>
      </music-measure>
      <music-measure>
        <music-staff-treble>
          <music-note note="A" duration="quarter"></music-note>
          <music-note note="A" duration="quarter"></music-note>
          <music-note note="A" duration="quarter"></music-note>
          <music-note note="A" duration="quarter"></music-note>
        </music-staff-treble>
        <music-staff-bass>
          <music-note note="A" duration="quarter"></music-note>
        </music-staff-bass>
        <music-staff-vocal></music-staff-vocal>
      </music-measure>
    </music-composition>
  );
}
