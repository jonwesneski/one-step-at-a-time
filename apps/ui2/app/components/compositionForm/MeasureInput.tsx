import '@one-step-at-a-time/web-components';
import { useFormContext } from 'react-hook-form';
import { StaffInput } from './StaffInput';
import type {
  CompositionFormValues,
  DraftMusicEntry,
  Selection,
  StaffType,
} from './types';

type Props = {
  measureId: string;
  isMeasureSelected: boolean;
  selection: Selection;
  onSelectMeasure: (id: string) => void;
  onSelectStaff: (
    measureId: string,
    staffId: string,
    e: React.MouseEvent
  ) => void;
  onAddEntry: (measureId: string, staffId: string, entry: DraftMusicEntry) => void;
  onAddStaff: (measureId: string, staffType: StaffType) => void;
};

export function MeasureInput({
  measureId,
  isMeasureSelected,
  selection,
  onSelectMeasure,
  onSelectStaff,
  onAddEntry,
  onAddStaff,
}: Props) {
  const { watch } = useFormContext<CompositionFormValues>();
  const measure = watch(`measuresById.${measureId}`);

  return (
    <music-measure
      className={`cursor-pointer rounded transition-shadow ${
        isMeasureSelected ? 'rainbow-selected pb-10' : ''
      }`}
      onClick={() => onSelectMeasure(measureId)}
    >
      {measure.staffIds.length === 0 && (
        <div className="text-zinc-400 text-sm px-3 py-4 select-none">
          Tap or click here and use the dropdown to add a staff
        </div>
      )}
      {measure.staffIds.map((staffId) => (
        <StaffInput
          key={staffId}
          staffId={staffId}
          measureId={measureId}
          isSelected={isMeasureSelected && selection.staffId === staffId}
          onSelectStaff={onSelectStaff}
          onAddEntry={onAddEntry}
        />
      ))}
      {isMeasureSelected && (
        <select
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 text-sm border border-zinc-300 rounded bg-white px-2 py-1 cursor-pointer shadow-sm"
          value=""
          onChange={(e) => {
            const value = e.target.value as StaffType;
            if (value) onAddStaff(measureId, value);
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="" disabled>
            Add staff...
          </option>
          <option value="treble">Treble</option>
          <option value="bass">Bass</option>
        </select>
      )}
    </music-measure>
  );
}
