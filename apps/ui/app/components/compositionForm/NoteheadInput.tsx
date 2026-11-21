import { Select } from '@/design-system';
import type { NoteheadType } from '@one-step-at-a-time/web-components';
import { NOTEHEADS } from '@one-step-at-a-time/web-components';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import { isTriangle } from './markingsHelpers';
import type { ChordEntry, NoteEntry } from './types';

const labelClass = 'text-xs font-medium text-fg-muted';
const DEFAULT = '';

function NoteheadSelect({
  value,
  onChange,
  allowTriangles,
  defaultLabel,
}: {
  value: NoteheadType | null | undefined;
  onChange: (value: NoteheadType | null) => void;
  allowTriangles: boolean;
  defaultLabel: string;
}) {
  return (
    <Select
      value={value ?? DEFAULT}
      onChange={(e) =>
        onChange(
          e.target.value === DEFAULT ? null : (e.target.value as NoteheadType)
        )
      }
    >
      <option value={DEFAULT}>{defaultLabel}</option>
      {NOTEHEADS.filter((h) => h !== 'normal').map((head) => (
        <option
          key={head}
          value={head}
          disabled={!allowTriangles && isTriangle(head)}
        >
          {head}
        </option>
      ))}
    </Select>
  );
}

export function NoteheadInput({ entry }: { entry: NoteEntry | ChordEntry }) {
  const { updateEntry } = useCompositionFormSession();
  const grace = entry.grace;

  return (
    <div
      className="flex flex-col gap-3 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <label className="flex flex-col gap-0.5">
        <span className={labelClass}>
          {entry.type === 'chord' ? 'Every tone' : 'Notehead'}
        </span>
        <NoteheadSelect
          value={entry.notehead}
          allowTriangles={entry.type === 'note' && !entry.beamGroupId}
          defaultLabel="normal"
          onChange={(notehead) => updateEntry({ ...entry, notehead })}
        />
      </label>
      {entry.type === 'note' && entry.beamGroupId && (
        <div className="text-xs text-fg-subtle">
          A triangle head always stands alone, so it can&apos;t join a
          cross-staff beam.
        </div>
      )}

      {entry.type === 'chord' && (
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Per tone</span>
          {entry.notes.map((tone, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-12 text-sm text-fg">
                {tone.value}
                {tone.octave ?? ''}
              </span>
              <NoteheadSelect
                value={tone.notehead}
                allowTriangles={false}
                defaultLabel="same as chord"
                onChange={(notehead) =>
                  updateEntry({
                    ...entry,
                    notes: entry.notes.map((n, idx) =>
                      idx === i ? { ...n, notehead } : n
                    ),
                  })
                }
              />
            </div>
          ))}
        </div>
      )}

      {grace && grace.notes.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className={labelClass}>Grace notes</span>
          {grace.notes.map((note, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-12 text-sm text-fg">{note}</span>
              <NoteheadSelect
                value={grace.noteheads?.[i]}
                allowTriangles={false}
                defaultLabel="normal"
                onChange={(notehead) =>
                  updateEntry({
                    ...entry,
                    grace: {
                      ...grace,
                      noteheads: grace.notes.map((_, idx) =>
                        idx === i ? notehead : grace.noteheads?.[idx] ?? null
                      ),
                    },
                  })
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
