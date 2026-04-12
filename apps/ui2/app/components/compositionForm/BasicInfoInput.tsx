import type { LetterNote, Mode } from '@one-step-at-a-time/web-components';
import { useFormContext } from 'react-hook-form';
import type { CompositionFormValues } from './types';

const KEY_SIGNATURE_OPTIONS: LetterNote[] = [
  'C', 'G', 'D', 'A', 'E', 'B', 'F#', 'Db', 'Ab', 'Eb', 'Bb', 'F',
];

const TIME_SIGNATURE_OPTIONS = [
  '4/4', '3/4', '2/4', '2/2', '6/8', '9/8', '12/8', '3/8', '5/4', '7/4',
];

const MODE_OPTIONS: Mode[] = ['major', 'minor'];

const labelClass = 'text-xs font-medium text-zinc-500 mb-0.5';
const inputClass =
  'w-full text-sm border border-zinc-300 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500';

export function BasicInfoInput() {
  const { register } = useFormContext<CompositionFormValues>();

  return (
    <div className="flex flex-wrap gap-4 items-end">
      <div className="flex flex-col min-w-48 flex-1">
        <label className={labelClass}>Song Title</label>
        <input
          type="text"
          placeholder="Untitled"
          className={inputClass}
          {...register('title')}
        />
      </div>

      <div className="flex flex-col">
        <label className={labelClass}>Key</label>
        <select className={inputClass} {...register('keySig')}>
          {KEY_SIGNATURE_OPTIONS.map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className={labelClass}>Time</label>
        <select className={inputClass} {...register('timeSig')}>
          {TIME_SIGNATURE_OPTIONS.map((time) => (
            <option key={time} value={time}>
              {time}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col">
        <label className={labelClass}>Mode</label>
        <select className={inputClass} {...register('mode')}>
          {MODE_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m.charAt(0).toUpperCase() + m.slice(1)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
