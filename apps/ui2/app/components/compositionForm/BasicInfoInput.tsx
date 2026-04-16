import { useFormContext } from 'react-hook-form';
import { Select, TextInput } from '../../design-system';
import {
  KEY_SIGNATURE_OPTIONS,
  MODE_OPTIONS,
  type CompositionFormValues,
} from './types';

const labelClass = 'text-xs font-medium text-zinc-500 mb-0.5';

export function BasicInfoInput() {
  const { register } = useFormContext<CompositionFormValues>();

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
        <Select className="w-full" {...register('timeSig')}>
          {KEY_SIGNATURE_OPTIONS.map((time) => (
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
    </div>
  );
}
