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
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-wrap min-h-screen w-full max-w-[900px] py-32 bg-white dark:bg-black">
        {/* <Measure />
        <Measure /> */}
        <music-measure currentCount={1}>
          <music-layer>
            <music-chord>
              <music-note x="10" note="A" duration="quarter"></music-note>
              <music-note x="10" note="E" duration="quarter"></music-note>
            </music-chord>
          </music-layer>
          {/* <music-layer> 
            <music-note x="10" duration="quarter"></music-note>
           </music-layer> */}
        </music-measure>
        <music-measure currentCount={2}>
          <music-layer>
            <music-note x="10" note="A" duration="quarter"></music-note>
            <music-note x="10" note="A" duration="quarter"></music-note>
          </music-layer>
          <music-layer>
            <music-note x="10" note="A" duration="quarter"></music-note>
          </music-layer>
        </music-measure>
        <music-measure currentCount={3}>
          <music-layer>
            <music-note x="10" note="A" duration="quarter"></music-note>
            <music-note x="10" note="A" duration="quarter"></music-note>
          </music-layer>
          <music-layer>
            <music-note x="10" note="A" duration="quarter"></music-note>
          </music-layer>
        </music-measure>
      </main>
    </div>
  );
}
