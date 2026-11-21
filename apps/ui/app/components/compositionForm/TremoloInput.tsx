import { Checkbox, Select, TextInput } from '@/design-system';
import type {
  TremoloLabel,
  TremoloValue,
} from '@one-step-at-a-time/web-components';
import { TREMOLO_LABELS } from '@one-step-at-a-time/web-components';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import { OptionalSelect } from './entryControls';
import { allowedTremoloValues, hasRepeatableLength } from './markingsHelpers';
import type { ChordEntry, NoteEntry } from './types';

const labelClass = 'text-xs font-medium text-fg-muted';
const NONE = 'none';

function tremoloLabel(value: TremoloValue): string {
  if (value === 'unmeasured') {
    return 'unmeasured';
  }
  return value === 1 ? '1 stroke' : `${value} strokes`;
}

// A single-note tremolo: strokes through one note's stem. Two notes
// alternating is a tremolo group instead (a multi-entry selection).
export function TremoloInput({ entry }: { entry: NoteEntry | ChordEntry }) {
  const { updateEntry } = useCompositionFormSession();
  const options = allowedTremoloValues(entry.duration);
  const measured =
    entry.tremolo !== null &&
    entry.tremolo !== undefined &&
    entry.tremolo !== 'unmeasured';

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <label className="flex flex-col gap-0.5">
        <span className={labelClass}>Strokes</span>
        <Select
          value={
            entry.tremolo === null || entry.tremolo === undefined
              ? NONE
              : String(entry.tremolo)
          }
          onChange={(e) => {
            const raw = e.target.value;
            const tremolo: TremoloValue | null =
              raw === NONE
                ? null
                : raw === 'unmeasured'
                ? 'unmeasured'
                : (Number(raw) as TremoloValue);
            updateEntry({ ...entry, tremolo });
          }}
        >
          <option value={NONE}>none</option>
          {options.map((value) => (
            <option key={value} value={String(value)}>
              {tremoloLabel(value)}
            </option>
          ))}
        </Select>
      </label>

      {measured && (
        <label className="flex flex-col gap-0.5">
          <span className={labelClass}>Tuplet numeral (optional)</span>
          <TextInput
            type="number"
            min={2}
            placeholder="e.g. 3"
            value={entry.tremoloTuplet ?? ''}
            onChange={(e) => {
              const n = Number(e.target.value);
              updateEntry({
                ...entry,
                tremoloTuplet:
                  e.target.value !== '' && Number.isInteger(n) && n >= 2
                    ? n
                    : null,
              });
            }}
          />
        </label>
      )}

      {measured && (
        <Checkbox
          label="Repeat the articulation for every repetition"
          disabled={!hasRepeatableLength(entry.articulation)}
          title={
            hasRepeatableLength(entry.articulation)
              ? undefined
              : 'Needs a staccato, staccatissimo, tenuto or portato articulation'
          }
          checked={entry.articulationRepeat ?? false}
          onChange={(e) =>
            updateEntry({ ...entry, articulationRepeat: e.target.checked })
          }
        />
      )}

      <OptionalSelect<TremoloLabel>
        label="Label (trem. / non trem.)"
        options={TREMOLO_LABELS}
        value={entry.tremoloLabel}
        onChange={(tremoloLabel) => updateEntry({ ...entry, tremoloLabel })}
      />
    </div>
  );
}
