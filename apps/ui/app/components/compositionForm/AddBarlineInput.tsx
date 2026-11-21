import { Button, Select } from '@/design-system';
import type { BarlineType } from '@one-step-at-a-time/web-components';
import { useState } from 'react';
import type { DraftMusicEntry } from './types';
import { BARLINE_TYPE_OPTIONS } from './types';

interface AddBarlineInputProps {
  onAdd: (entry: DraftMusicEntry) => void;
  // Why a barline can't go at the end of voice 1 right now, or null.
  blockedReason: string | null;
}

// A mid-bar barline, appended after voice 1's last entry. A barline at the
// start or end of a bar belongs on the measure (its Repeats tab) instead.
export function AddBarlineInput({
  onAdd,
  blockedReason,
}: AddBarlineInputProps) {
  const [barlineType, setBarlineType] = useState<BarlineType>('double');

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <label className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-zinc-500">Barline</span>
        <Select
          value={barlineType}
          onChange={(e) => setBarlineType(e.target.value as BarlineType)}
        >
          {BARLINE_TYPE_OPTIONS.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </Select>
      </label>
      {blockedReason && (
        <div className="text-xs text-zinc-400">{blockedReason}</div>
      )}
      <Button
        type="button"
        disabled={blockedReason !== null}
        onClick={() => onAdd({ type: 'barline', barlineType })}
      >
        Add
      </Button>
    </div>
  );
}
