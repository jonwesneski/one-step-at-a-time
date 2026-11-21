import { Button, Select } from '@/design-system';
import type { ClefType } from '@one-step-at-a-time/web-components';
import { CLEFS } from '@one-step-at-a-time/web-components';
import { useState } from 'react';
import type { DraftMusicEntry } from './types';

interface AddClefInputProps {
  onAdd: (entry: DraftMusicEntry) => void;
  // Accepted for a uniform tab signature; a clef consumes no beat budget.
  remainingBeats?: number;
}

export function AddClefInput({ onAdd }: AddClefInputProps) {
  const [clef, setClef] = useState<ClefType>('treble');

  return (
    <div
      className="flex flex-col gap-2 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <label className="flex flex-col gap-0.5">
        <span className="text-xs font-medium text-fg-muted">Clef</span>
        <Select
          value={clef}
          onChange={(e) => setClef(e.target.value as ClefType)}
        >
          {CLEFS.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
      </label>
      <Button type="button" onClick={() => onAdd({ type: 'clef', clef })}>
        Add
      </Button>
    </div>
  );
}
