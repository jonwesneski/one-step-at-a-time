import { durationToFactor } from '@one-step-at-a-time/web-components';
import type { DurationType, Note } from '@one-step-at-a-time/web-components';
import { useState } from 'react';
import { useFormContext } from 'react-hook-form';
import type { CompositionFormValues, MusicEntry } from './types';
import { DURATION_OPTIONS, NOTE_OPTIONS } from './types';

type Props = { onAdd: (entry: MusicEntry) => void; remainingBeats: number };

const selectClass =
  'text-sm border border-zinc-300 rounded bg-white px-2 py-1 cursor-pointer';
const btnPrimary =
  'px-3 py-1.5 text-sm rounded border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed';
const btnSecondary =
  'px-3 py-1.5 text-sm rounded border border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 cursor-pointer';

export function NoteChordInput({ onAdd, remainingBeats }: Props) {
  const { setValue, watch } = useFormContext<CompositionFormValues>();

  const activeTab = watch('tab');

  const [noteValue, setNoteValue] = useState<Note>('C');
  const [noteDuration, setNoteDuration] = useState<DurationType>('quarter');
  const [chordNotes, setChordNotes] = useState<Array<{ value: Note }>>([
    { value: 'C' },
    { value: 'E' },
  ]);
  const [chordDuration, setChordDuration] = useState<DurationType>('quarter');

  const canAddNote = durationToFactor[noteDuration] <= remainingBeats;
  const canAddChord = durationToFactor[chordDuration] <= remainingBeats;

  function handleNoteAdd() {
    onAdd({ type: 'note', value: noteValue, duration: noteDuration });
  }

  function handleChordAdd() {
    onAdd({
      type: 'chord',
      notes: chordNotes.map((n) => n.value),
      duration: chordDuration,
    });
  }

  return (
    <div
      className="border border-zinc-200 rounded bg-white shadow-sm mt-2"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex border-b border-zinc-200">
        <button
          type="button"
          className={`px-4 py-2 text-sm cursor-pointer bg-transparent border-0 ${
            activeTab === 'note'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
          onClick={() => setValue('tab', 'note')}
        >
          Note
        </button>
        <button
          type="button"
          className={`px-4 py-2 text-sm cursor-pointer bg-transparent border-0 ${
            activeTab === 'chord'
              ? 'border-b-2 border-blue-600 text-blue-600 font-medium'
              : 'text-zinc-500 hover:text-zinc-700'
          }`}
          onClick={() => setValue('tab', 'chord')}
        >
          Chord
        </button>
      </div>

      <div className="p-3 flex flex-col gap-2">
        {activeTab === 'note' && (
          <>
            <select
              className={selectClass}
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value as Note)}
            >
              {NOTE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <select
              className={selectClass}
              value={noteDuration}
              onChange={(e) => setNoteDuration(e.target.value as DurationType)}
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={btnPrimary}
              disabled={!canAddNote}
              onClick={handleNoteAdd}
            >
              Add
            </button>
          </>
        )}

        {activeTab === 'chord' && (
          <>
            {chordNotes.map((note, i) => (
              <select
                key={i}
                className={selectClass}
                value={note.value}
                onChange={(e) =>
                  setChordNotes((prev) =>
                    prev.map((n, idx) =>
                      idx === i ? { value: e.target.value as Note } : n
                    )
                  )
                }
              >
                {NOTE_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            ))}
            <button
              type="button"
              className={btnSecondary}
              onClick={() => setChordNotes((prev) => [...prev, { value: 'C' }])}
            >
              + Add Note
            </button>
            <select
              className={selectClass}
              value={chordDuration}
              onChange={(e) => setChordDuration(e.target.value as DurationType)}
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={btnPrimary}
              disabled={!canAddChord}
              onClick={handleChordAdd}
            >
              Add
            </button>
          </>
        )}
      </div>
    </div>
  );
}
