import { Checkbox, TextInput } from '@/design-system';
import type { MeasureEndBarline } from '@one-step-at-a-time/web-components';
import { useEffect, useState } from 'react';
import { useFormContext, useWatch } from 'react-hook-form';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import { OptionalSelect } from './entryControls';
import { repeatWarnings, setMeasureRepeat } from './repeatsHelpers';
import type {
  CompositionFormValues,
  CompositionStructure,
  NormalizedMeasure,
} from './types';
import { MEASURE_END_BARLINE_OPTIONS } from './types';

const labelClass = 'text-xs font-medium text-fg-muted';
const PASSES = [1, 2, 3, 4];

interface RepeatInputProps {
  measureId: string;
  measure: NormalizedMeasure;
  structure: CompositionStructure;
}

export function RepeatInput({
  measureId,
  measure,
  structure,
}: RepeatInputProps) {
  const { editStructure } = useCompositionFormSession();
  const { control } = useFormContext<CompositionFormValues>();
  const endingNumbering = useWatch({ control, name: 'endingNumbering' });
  const warnings = repeatWarnings(structure, endingNumbering);
  const ending = measure.ending ?? [];
  // Committed on blur/Enter so typing a label is one undo step.
  const [labelDraft, setLabelDraft] = useState(measure.endingLabel ?? '');
  useEffect(() => {
    setLabelDraft(measure.endingLabel ?? '');
  }, [measure.endingLabel]);

  const patch = (next: Parameters<typeof setMeasureRepeat>[2]) =>
    editStructure((s) => setMeasureRepeat(s, measureId, next));

  return (
    <div
      className="flex flex-col gap-3 p-3"
      onClick={(e) => e.stopPropagation()}
    >
      <Checkbox
        label="Start repeat at the beginning of this bar"
        checked={measure.repeatStart ?? false}
        onChange={(e) => patch({ repeatStart: e.target.checked })}
      />

      <OptionalSelect<MeasureEndBarline>
        label="Barline at the end of this bar"
        options={MEASURE_END_BARLINE_OPTIONS.filter((b) => b !== 'single')}
        value={measure.barline}
        noneLabel="single"
        onChange={(barline) => patch({ barline })}
      />

      <div className="flex flex-col gap-1">
        <span className={labelClass}>Ending — played on pass</span>
        <div className="flex flex-wrap gap-3">
          {PASSES.map((pass) => (
            <Checkbox
              key={pass}
              label={`${pass}.`}
              checked={ending.includes(pass)}
              onChange={(e) =>
                patch({
                  ending: e.target.checked
                    ? [...ending, pass]
                    : ending.filter((p) => p !== pass),
                })
              }
            />
          ))}
        </div>
      </div>

      {ending.length > 0 && (
        <label className="flex flex-col gap-0.5">
          <span className={labelClass}>Ending label (optional)</span>
          <TextInput
            type="text"
            placeholder={ending.map((pass) => `${pass}.`).join('')}
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={() => patch({ endingLabel: labelDraft })}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                patch({ endingLabel: labelDraft });
              }
            }}
          />
        </label>
      )}

      {warnings.length > 0 && (
        <ul className="flex flex-col gap-1 text-xs text-warning">
          {warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
