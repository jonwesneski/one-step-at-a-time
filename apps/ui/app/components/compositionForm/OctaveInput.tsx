import { Select } from '@/design-system';
import type { OctaveShiftAmount } from '@one-step-at-a-time/web-components';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import type { OctaveSpanRange, OctaveSpanSettings } from './octaveHelpers';
import {
  DEFAULT_OCTAVE_SPAN_SETTINGS,
  octaveAmountFits,
  octaveSpanContaining,
  removeOctaveSpan,
  upsertOctaveSpan,
} from './octaveHelpers';
import type { CompositionStructure } from './types';
import {
  OCTAVE_CONTINUATION_MODE_OPTIONS,
  OCTAVE_DISPLAY_MODE_OPTIONS,
  OCTAVE_SHIFT_AMOUNT_OPTIONS,
} from './types';

interface OctaveInputProps {
  range: OctaveSpanRange;
  structure: CompositionStructure;
}

const labelClass = 'text-xs font-medium text-zinc-500';
const NONE = '';

const END_LABEL: Record<OctaveSpanSettings['end'], string> = {
  stop: 'corner',
  loco: 'corner + loco',
};

export function OctaveInput({ range, structure }: OctaveInputProps) {
  const { editStructure } = useCompositionFormSession();
  const existing = octaveSpanContaining(structure, range);
  const spanRange = existing ?? range;
  const amountOptions = OCTAVE_SHIFT_AMOUNT_OPTIONS.filter(
    (amount) =>
      amount === existing?.amount ||
      octaveAmountFits(structure, spanRange, amount, existing?.id ?? null)
  );

  // Every option offered here was pre-checked to fit, so a null result only
  // happens when pitches were edited out of range in between; leave the
  // structure unchanged then.
  const apply = (patch: Partial<OctaveSpanSettings>) =>
    editStructure((s) => {
      const base = existing ?? { ...DEFAULT_OCTAVE_SPAN_SETTINGS };
      const amount = patch.amount ?? existing?.amount;
      if (!amount) {
        return s;
      }
      return (
        upsertOctaveSpan(
          s,
          spanRange,
          {
            amount,
            mode: patch.mode ?? base.mode,
            continuation: patch.continuation ?? base.continuation,
            end: patch.end ?? base.end,
          },
          existing?.id ?? null
        ) ?? s
      );
    });

  const remove = () =>
    editStructure((s) =>
      existing ? removeOctaveSpan(s, existing.id) ?? s : s
    );

  const cannotRemove =
    existing !== null && removeOctaveSpan(structure, existing.id) === null;

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <label className="flex flex-col gap-0.5">
        <span className={labelClass}>Octave line</span>
        <Select
          value={existing?.amount ?? NONE}
          disabled={cannotRemove && amountOptions.length <= 1}
          onChange={(e) =>
            e.target.value === NONE
              ? remove()
              : apply({ amount: e.target.value as OctaveShiftAmount })
          }
        >
          <option value={NONE} disabled={cannotRemove}>
            none
          </option>
          {amountOptions.map((amount) => (
            <option key={amount} value={amount}>
              {amount}
            </option>
          ))}
        </Select>
      </label>
      {cannotRemove && (
        <div className="text-xs text-zinc-400">
          Removing this line would put a note outside the octaves the staff can
          show.
        </div>
      )}
      {amountOptions.length === 0 && !existing && (
        <div className="text-xs text-zinc-400">
          No octave line fits — the notes would move outside the octaves the
          staff can show.
        </div>
      )}
      {existing && (
        <>
          <label className="flex flex-col gap-0.5">
            <span className={labelClass}>Label</span>
            <Select
              value={existing.mode}
              onChange={(e) =>
                apply({ mode: e.target.value as OctaveSpanSettings['mode'] })
              }
            >
              {OCTAVE_DISPLAY_MODE_OPTIONS.map((mode) => (
                <option key={mode} value={mode}>
                  {mode === 'col' ? `col ${existing.amount}` : existing.amount}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className={labelClass}>End</span>
            <Select
              value={existing.end}
              onChange={(e) =>
                apply({ end: e.target.value as OctaveSpanSettings['end'] })
              }
            >
              {(['stop', 'loco'] as const).map((end) => (
                <option key={end} value={end}>
                  {END_LABEL[end]}
                </option>
              ))}
            </Select>
          </label>
          <label className="flex flex-col gap-0.5">
            <span className={labelClass}>At a system break</span>
            <Select
              value={existing.continuation}
              onChange={(e) =>
                apply({
                  continuation: e.target
                    .value as OctaveSpanSettings['continuation'],
                })
              }
            >
              {OCTAVE_CONTINUATION_MODE_OPTIONS.map((continuation) => (
                <option key={continuation} value={continuation}>
                  {continuation === 'bracketed'
                    ? `restate (${existing.amount})`
                    : 'line only'}
                </option>
              ))}
            </Select>
          </label>
        </>
      )}
    </div>
  );
}
