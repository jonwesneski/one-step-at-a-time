import { durationToFactor } from '@one-step-at-a-time/web-components';
import { useFieldArray, useFormContext } from 'react-hook-form';
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
  const { register, handleSubmit, setValue, watch, control } =
    useFormContext<CompositionFormValues>();

  const { fields, append } = useFieldArray({ control, name: 'chordNotes' });

  const activeTab = watch('tab');
  const noteDuration = watch('noteDuration');
  const chordDuration = watch('chordDuration');

  const canAddNote = durationToFactor[noteDuration] <= remainingBeats;
  const canAddChord = durationToFactor[chordDuration] <= remainingBeats;

  function handleNoteAdd(data: CompositionFormValues) {
    onAdd({ type: 'note', value: data.noteValue, duration: data.noteDuration });
  }

  function handleChordAdd(data: CompositionFormValues) {
    onAdd({
      type: 'chord',
      notes: data.chordNotes.map((n) => n.value),
      duration: data.chordDuration,
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
            <select className={selectClass} {...register('noteValue')}>
              {NOTE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <select className={selectClass} {...register('noteDuration')}>
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
              onClick={handleSubmit(handleNoteAdd)}
            >
              Add
            </button>
          </>
        )}

        {activeTab === 'chord' && (
          <>
            {fields.map((field, i) => (
              <select
                key={field.id}
                className={selectClass}
                {...register(`chordNotes.${i}.value`)}
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
              onClick={() => append({ value: 'C' })}
            >
              + Add Note
            </button>
            <select className={selectClass} {...register('chordDuration')}>
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
              onClick={handleSubmit(handleChordAdd)}
            >
              Add
            </button>
          </>
        )}
      </div>
    </div>
  );
}
