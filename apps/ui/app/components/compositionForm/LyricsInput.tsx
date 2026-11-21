import { Button } from '@/design-system';
import { useEffect, useState } from 'react';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import {
  parseLyricSyllables,
  setStaffLyrics,
  sungEntryCount,
} from './lyricsHelpers';
import type { CompositionStructure, LyricVerse, VocalStaff } from './types';

const labelClass = 'text-xs font-medium text-zinc-500';
const textareaClass =
  'w-full text-sm border border-zinc-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500';

const withAtLeastOneVerse = (verses: LyricVerse[]): LyricVerse[] =>
  verses.length > 0 ? verses : [{ verse: 1, text: '' }];

interface LyricsInputProps {
  staff: VocalStaff;
  structure: CompositionStructure;
}

// This measure's lyrics, one text per verse. Edits commit on blur, so typing
// a verse is one undo step.
export function LyricsInput({ staff, structure }: LyricsInputProps) {
  const { editStructure } = useCompositionFormSession();
  const savedKey = JSON.stringify(staff.lyrics ?? []);
  const [drafts, setDrafts] = useState<LyricVerse[]>(() =>
    withAtLeastOneVerse(JSON.parse(savedKey))
  );
  useEffect(() => {
    setDrafts(withAtLeastOneVerse(JSON.parse(savedKey)));
  }, [savedKey]);
  const notes = sungEntryCount(structure, staff);

  const commit = (next: LyricVerse[]) =>
    editStructure((s) => setStaffLyrics(s, staff.id, next));

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="text-xs text-zinc-400">
        Split syllables with “-”; end a syllable with “_” to hold it over
        several notes.
      </div>
      {drafts.map((draft, i) => {
        const syllables = parseLyricSyllables(draft.text).length;
        return (
          <label key={draft.verse} className="flex flex-col gap-0.5">
            <span className={labelClass}>
              Verse {draft.verse} — {syllables} of {notes} notes
            </span>
            <textarea
              className={textareaClass}
              rows={2}
              value={draft.text}
              onChange={(e) =>
                setDrafts(
                  drafts.map((d, idx) =>
                    idx === i ? { ...d, text: e.target.value } : d
                  )
                )
              }
              onBlur={() => commit(drafts)}
            />
            {syllables > notes && (
              <span className="text-xs text-amber-700">
                More syllables than notes; the extra ones aren’t shown.
              </span>
            )}
          </label>
        );
      })}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            setDrafts([
              ...drafts,
              {
                verse: Math.max(0, ...drafts.map((d) => d.verse)) + 1,
                text: '',
              },
            ])
          }
        >
          + Add verse
        </Button>
        {drafts.length > 1 && (
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const next = drafts.slice(0, -1);
              setDrafts(next);
              commit(next);
            }}
          >
            Remove last verse
          </Button>
        )}
      </div>
    </div>
  );
}
