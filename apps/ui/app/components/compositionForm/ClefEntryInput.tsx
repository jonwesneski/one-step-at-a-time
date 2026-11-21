import { Button, Select } from '@/design-system';
import type { ClefType } from '@one-step-at-a-time/web-components';
import { CLEFS } from '@one-step-at-a-time/web-components';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import type { ClefEntry } from './types';

// Edits or removes an already-placed mid-stream <music-clef> marker. A new clef
// is added from the staff panel's "Clef Change" tab (AddClefInput).
interface ClefEntryInputProps {
  entry: ClefEntry;
}

export function ClefEntryInput({ entry }: ClefEntryInputProps) {
  const { updateEntry, deleteSelected } = useCompositionFormSession();

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <label className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-fg-muted">Clef</span>
        <Select
          value={entry.clef}
          onChange={(e) =>
            updateEntry({ ...entry, clef: e.target.value as ClefType })
          }
        >
          {CLEFS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </label>
      <Button type="button" variant="secondary" onClick={deleteSelected}>
        Remove clef change
      </Button>
    </div>
  );
}
