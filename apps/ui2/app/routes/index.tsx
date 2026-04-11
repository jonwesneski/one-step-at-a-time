import '@one-step-at-a-time/web-components';
import { createFileRoute } from '@tanstack/react-router';
import { useState } from 'react';
import { ClientOnly } from '../components/ClientOnly';

export const Route = createFileRoute('/')({
  component: Home,
});

type StaffType = 'treble' | 'bass';

type Measure = {
  id: string;
  staves: StaffType[];
};

type Selection = {
  measureId: string | null;
  staffType: StaffType | null;
};

function CompositionEditor() {
  const [measures, setMeasures] = useState<Measure[]>([
    { id: crypto.randomUUID(), staves: [] },
  ]);
  const [selection, setSelection] = useState<Selection>({
    measureId: null,
    staffType: null,
  });

  function addMeasure() {
    const newId = crypto.randomUUID();
    setMeasures((prev) => [...prev, { id: newId, staves: [] }]);
    setSelection({ measureId: newId, staffType: null });
  }

  function addStaff(measureId: string, staffType: StaffType) {
    setMeasures((prev) =>
      prev.map((m) =>
        m.id === measureId ? { ...m, staves: [...m.staves, staffType] } : m
      )
    );
  }

  function selectMeasure(id: string) {
    setSelection({ measureId: id, staffType: null });
  }

  function selectStaff(
    measureId: string,
    staffType: StaffType,
    e: React.MouseEvent
  ) {
    e.stopPropagation();
    setSelection({ measureId, staffType });
  }

  const btnPrimary =
    'px-3 py-1.5 text-sm rounded border border-blue-600 bg-blue-600 text-white hover:bg-blue-700 cursor-pointer';

  return (
    <div className="flex flex-col gap-4">
      <header className="p-3 bg-white rounded border border-zinc-200 shadow-sm" />

      <music-composition>
        {measures.map((measure) => {
          const isMeasureSelected = selection.measureId === measure.id;
          return (
            <music-measure
              key={measure.id}
              className={`cursor-pointer rounded transition-shadow ${
                isMeasureSelected ? 'ring-2 ring-blue-400' : ''
              } ${isMeasureSelected ? 'pb-10' : ''}`}
              onClick={() => selectMeasure(measure.id)}
            >
              {measure.staves.length === 0 && (
                <div className="text-zinc-400 text-sm px-3 py-4 select-none">
                  Select this measure and use the dropdown to add a staff
                </div>
              )}
              {measure.staves.map((staffType, index) => {
                const isStaffSelected =
                  isMeasureSelected && selection.staffType === staffType;
                const staffClass = `cursor-pointer rounded transition-shadow ${
                  isStaffSelected ? 'ring-2 ring-blue-600' : ''
                }`;
                return staffType === 'treble' ? (
                  <music-staff-treble
                    key={index}
                    className={staffClass}
                    onClick={(e) => selectStaff(measure.id, staffType, e)}
                  />
                ) : (
                  <music-staff-bass
                    key={index}
                    className={staffClass}
                    onClick={(e) => selectStaff(measure.id, staffType, e)}
                  />
                );
              })}
              {isMeasureSelected && (
                <select
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 text-sm border border-zinc-300 rounded bg-white px-2 py-1 cursor-pointer shadow-sm"
                  value=""
                  onChange={(e) => {
                    const value = e.target.value as StaffType;
                    if (value) addStaff(measure.id, value);
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
        })}
        <button
          className={`${btnPrimary} place-self-center ml-2`}
          onClick={addMeasure}
        >
          Add Measure
        </button>
      </music-composition>
    </div>
  );
}

function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 font-sans p-6">
      <ClientOnly>
        <CompositionEditor />
      </ClientOnly>
    </main>
  );
}
