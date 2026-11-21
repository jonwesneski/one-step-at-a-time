import { Checkbox, Select, TextInput } from '@/design-system';
import type {
  MeasureNumberDisplay,
  TimeSignature,
} from '@one-step-at-a-time/web-components';
import { useFormContext, useWatch } from 'react-hook-form';
import { useCompositionFormSession } from './CompositionFormSessionContext';
import {
  ENDING_NUMBERING_OPTIONS,
  KEY_SIGNATURE_OPTIONS,
  MEASURE_NUMBER_DISPLAY_OPTIONS,
  MODE_OPTIONS,
  TIME_SIGNATURE_OPTIONS,
  type CompositionFormValues,
} from './types';

const labelClass = 'text-xs font-medium text-fg-muted mb-0.5';

const MEASURE_NUMBER_LABELS: Record<MeasureNumberDisplay, string> = {
  none: 'None',
  all: 'Every bar',
  'row-start': 'Start of each row',
  'row-end': 'End of each row',
  odd: 'Odd bars',
  even: 'Even bars',
};

export function BasicInfoInput() {
  const { register, control, setValue } =
    useFormContext<CompositionFormValues>();
  const { requestTimeSignatureChange } = useCompositionFormSession();
  const timeSig = useWatch({ control, name: 'timeSig' });
  const maxWidth = useWatch({ control, name: 'maxWidth' });

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex flex-col min-w-48 flex-1">
        <label className={labelClass}>Song Title</label>
        <TextInput type="text" placeholder="Untitled" {...register('title')} />
      </div>

      <div className="flex flex-col">
        <label className={labelClass}>Key</label>
        <Select className="w-full" {...register('keySig')}>
          {KEY_SIGNATURE_OPTIONS.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col">
        <label className={labelClass}>Time</label>
        <Select
          className="w-full"
          value={timeSig}
          onChange={(e) =>
            requestTimeSignatureChange({
              scope: 'composition',
              timeSig: e.target.value as TimeSignature,
            })
          }
        >
          {TIME_SIGNATURE_OPTIONS.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col">
        <label className={labelClass}>Mode</label>
        <Select className="w-full" {...register('mode')}>
          {MODE_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col">
        <label className={labelClass}>Bar numbers</label>
        <Select className="w-full" {...register('measureNumbers')}>
          {MEASURE_NUMBER_DISPLAY_OPTIONS.map((display) => (
            <option key={display} value={display}>
              {MEASURE_NUMBER_LABELS[display]}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col">
        <label className={labelClass}>Ending numbers</label>
        <Select className="w-full" {...register('endingNumbering')}>
          {ENDING_NUMBERING_OPTIONS.map((numbering) => (
            <option key={numbering} value={numbering}>
              {numbering === 'consecutive'
                ? 'Count every bar'
                : 'Repeat numbers in endings (19a, 19b)'}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col justify-end pb-1.5">
        <Checkbox
          label="Double bar before a start repeat"
          {...register('doubleBarBeforeRepeat')}
        />
      </div>

      <div className="flex flex-col">
        <label className={labelClass}>Max width (px)</label>
        <div className="flex items-center gap-2">
          <TextInput
            type="number"
            min={1}
            placeholder="Default"
            className="w-28"
            disabled={maxWidth === 'none'}
            value={typeof maxWidth === 'number' ? maxWidth : ''}
            onChange={(e) => {
              const width = Number(e.target.value);
              setValue(
                'maxWidth',
                e.target.value !== '' && width > 0 ? width : null
              );
            }}
          />
          <Checkbox
            label="Full width"
            checked={maxWidth === 'none'}
            onChange={(e) =>
              setValue('maxWidth', e.target.checked ? 'none' : null)
            }
          />
        </div>
      </div>
    </div>
  );
}
