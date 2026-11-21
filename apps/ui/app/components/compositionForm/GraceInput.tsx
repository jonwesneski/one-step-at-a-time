import { Button, Select } from '@/design-system';
import type {
  ArticulationType,
  GraceDuration,
  GraceSlur,
  GraceType,
  Note,
  Octave,
} from '@one-step-at-a-time/web-components';
import {
  ARTICULATIONS,
  DYNAMICS,
  GRACE_DURATIONS,
  GRACE_SLURS,
  GRACE_TYPES,
} from '@one-step-at-a-time/web-components';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import { OctaveSelect, PitchSelect } from './entryControls';
import type { ChordEntry, GraceGroup, NoteEntry } from './types';

type GraceHost = NoteEntry | ChordEntry;

const labelClass = 'text-xs font-medium text-fg-muted';
const NONE = 'none';

function alignedGet<T>(
  list: (T | null)[] | undefined,
  index: number
): T | null {
  return list?.[index] ?? null;
}

function alignedSet<T>(
  list: (T | null)[] | undefined,
  index: number,
  value: T | null,
  length: number
): (T | null)[] {
  const next = Array.from({ length }, (_, i) => alignedGet(list, i));
  next[index] = value;
  return next;
}

export function GraceInput({ entry }: { entry: GraceHost }) {
  const { updateEntry } = useCompositionFormSession();
  const grace = entry.grace ?? null;

  const setGrace = (next: GraceGroup | null) => {
    updateEntry({ ...entry, grace: next });
  };

  if (!grace) {
    return (
      <div className="p-3" onClick={(e) => e.stopPropagation()}>
        <Button type="button" onClick={() => setGrace({ notes: ['C'] })}>
          Add grace notes
        </Button>
      </div>
    );
  }

  const patch = (next: Partial<GraceGroup>) => setGrace({ ...grace, ...next });
  const count = grace.notes.length;

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col gap-2">
        {grace.notes.map((note, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <PitchSelect
              className="flex-1"
              value={note}
              onChange={(value: Note) =>
                patch({
                  notes: grace.notes.map((n, idx) => (idx === i ? value : n)),
                })
              }
            />
            <OctaveSelect
              value={alignedGet(grace.octaves, i)}
              onChange={(octave: Octave | null) =>
                patch({
                  octaves: alignedSet(grace.octaves, i, octave, count),
                })
              }
            />
            <Select
              value={alignedGet(grace.articulations, i) ?? NONE}
              onChange={(e) =>
                patch({
                  articulations: alignedSet(
                    grace.articulations,
                    i,
                    e.target.value === NONE
                      ? null
                      : (e.target.value as ArticulationType),
                    count
                  ),
                })
              }
            >
              <option value={NONE}>no mark</option>
              {ARTICULATIONS.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </Select>
            {count > 1 && (
              <Button
                type="button"
                variant="secondary"
                onClick={() =>
                  patch({
                    notes: grace.notes.filter((_, idx) => idx !== i),
                    octaves: grace.octaves?.filter((_, idx) => idx !== i),
                    articulations: grace.articulations?.filter(
                      (_, idx) => idx !== i
                    ),
                  })
                }
              >
                −
              </Button>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() => patch({ notes: [...grace.notes, 'C'] })}
        >
          + Add grace note
        </Button>
      </div>

      <label className="flex flex-col gap-0.5">
        <span className={labelClass}>Style</span>
        <Select
          value={grace.type ?? ''}
          onChange={(e) =>
            patch({ type: (e.target.value || undefined) as GraceType })
          }
        >
          <option value="">default (acciaccatura)</option>
          {GRACE_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-0.5">
        <span className={labelClass}>Duration</span>
        <Select
          value={grace.duration ?? ''}
          onChange={(e) =>
            patch({ duration: (e.target.value || undefined) as GraceDuration })
          }
        >
          <option value="">default</option>
          {GRACE_DURATIONS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-0.5">
        <span className={labelClass}>Slur</span>
        <Select
          value={grace.slur ?? ''}
          onChange={(e) =>
            patch({ slur: (e.target.value || undefined) as GraceSlur })
          }
        >
          <option value="">default (auto)</option>
          {GRACE_SLURS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </label>

      <label className="flex flex-col gap-0.5">
        <span className={labelClass}>Dynamic</span>
        <Select
          value={grace.dynamic ?? NONE}
          onChange={(e) =>
            patch({
              dynamic:
                e.target.value === NONE
                  ? undefined
                  : (e.target.value as GraceGroup['dynamic']),
            })
          }
        >
          <option value={NONE}>none</option>
          {DYNAMICS.map((d) => (
            <option key={d} value={d}>
              {d}
            </option>
          ))}
        </Select>
      </label>

      <Button type="button" variant="secondary" onClick={() => setGrace(null)}>
        Remove grace notes
      </Button>
    </div>
  );
}
