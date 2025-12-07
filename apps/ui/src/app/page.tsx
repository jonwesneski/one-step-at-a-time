'use client';
// import Measure from "./_components/Measure";
// import './_components/chord';

import '@rest-in-time/design-system/client';
// apps/ui/src/app/layout.tsx
import type {} from '@rest-in-time/design-system';
import '../../../../packages/design-system/src/custom-elements.d.ts';
// ... rest of your layout
// import './_components/layer';
// import './_components/measure2';
// import './_components/note_';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans">
      <main className="flex flex-wrap min-h-screen w-full max-w-[900px] py-32">
        {/* <Measure />
        <Measure /> */}
        <music-measure currentCount={1}>
          <music-staff-treble>
            <music-chord>
              <music-note x="10" note="A" duration="quarter"></music-note>
              <music-note x="10" note="E" duration="quarter"></music-note>
            </music-chord>
          </music-staff-treble>
          {/* <music-staff-treble> 
            <music-note x="10" duration="quarter"></music-note>
           </music-staff-treble> */}
        </music-measure>
        <music-measure currentCount={2}>
          <music-staff-treble>
            <music-note x="10" note="A" duration="eighth"></music-note>
            <music-note x="10" note="A" duration="eighth"></music-note>
          </music-staff-treble>
          <music-staff-bass>
            <music-note x="10" note="A" duration="quarter"></music-note>
          </music-staff-bass>
        </music-measure>
        <music-measure currentCount={3}>
          <music-staff-treble>
            <music-note x="10" note="A" duration="quarter"></music-note>
            <music-note x="10" note="A" duration="quarter"></music-note>
          </music-staff-treble>
          <music-staff-guitar-tab></music-staff-guitar-tab>
        </music-measure>
      </main>
    </div>
  );
}
