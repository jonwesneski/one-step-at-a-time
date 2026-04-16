import type { DurationType, Note } from '@one-step-at-a-time/web-components';
import { durationToFactor } from '@one-step-at-a-time/web-components';
import { useState } from 'react';
import { Button, Select } from '../../design-system';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import type { DraftMusicEntry } from './types';
import { DURATION_OPTIONS, NOTE_OPTIONS } from './types';

interface NoteChordInputProps {
  onAdd: (entry: DraftMusicEntry) => void;
  remainingBeats: number;
}

export function NoteChordInput({ onAdd, remainingBeats }: NoteChordInputProps) {
  const { session, setSession } = useCompositionFormSession();

  const activeTab = session.tab;

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
      className="border border-zinc-200 rounded bg-white"
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
          onClick={() => setSession({ tab: 'note' })}
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
          onClick={() => setSession({ tab: 'chord' })}
        >
          Chord
        </button>
      </div>

      <div className="p-3 flex flex-col gap-2">
        {activeTab === 'note' && (
          <>
            <Select
              value={noteValue}
              onChange={(e) => setNoteValue(e.target.value as Note)}
            >
              {NOTE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
            <Select
              value={noteDuration}
              onChange={(e) => setNoteDuration(e.target.value as DurationType)}
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              disabled={!canAddNote}
              onClick={handleNoteAdd}
            >
              Add
            </Button>
          </>
        )}

        {activeTab === 'chord' && (
          <>
            {chordNotes.map((note, i) => (
              <Select
                key={i}
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
              </Select>
            ))}
            <Button
              type="button"
              variant="secondary"
              onClick={() => setChordNotes((prev) => [...prev, { value: 'C' }])}
            >
              + Add Note
            </Button>
            <Select
              value={chordDuration}
              onChange={(e) => setChordDuration(e.target.value as DurationType)}
            >
              {DURATION_OPTIONS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </Select>
            <Button
              type="button"
              disabled={!canAddChord}
              onClick={handleChordAdd}
            >
              Add
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
