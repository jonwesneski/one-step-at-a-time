import { Button, Select } from '@/design-system';
import type { BarlineType } from '@one-step-at-a-time/web-components';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import type { BarlineEntry } from './types';
import { BARLINE_TYPE_OPTIONS } from './types';

// Edits or removes a placed mid-bar barline. A new one is added from the
// staff panel's "Barline" tab (AddBarlineInput).
export function BarlineEntryInput({ entry }: { entry: BarlineEntry }) {
  const { updateEntry, deleteSelected } = useCompositionFormSession();

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <label className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-fg-muted">Barline</span>
        <Select
          value={entry.barlineType}
          onChange={(e) =>
            updateEntry({
              ...entry,
              barlineType: e.target.value as BarlineType,
            })
          }
        >
          {BARLINE_TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </label>
      <Button type="button" variant="secondary" onClick={deleteSelected}>
        Remove barline
      </Button>
    </div>
  );
}
