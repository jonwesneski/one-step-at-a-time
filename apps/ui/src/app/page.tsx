'use client';

import '@rest-in-time/design-system/client';

import type {} from '@rest-in-time/design-system';
import '../../../../packages/design-system/src/custom-elements.d.ts';

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans">
      <main>
        <music-composition keySig="D" mode="major" time="4/4">
          <music-measure>
            <music-staff-treble>
              <music-chord duration="eighth">
                <music-note value="A"></music-note>
                <music-note value="E"></music-note>
              </music-chord>
              <music-chord duration="eighth">
                <music-note value="A"></music-note>
                <music-note value="E"></music-note>
              </music-chord>
            </music-staff-treble>
          </music-measure>
          <music-measure>
            <music-staff-treble>
              <music-note value="A" duration="eighth"></music-note>
              <music-note value="D" duration="eighth"></music-note>
            </music-staff-treble>
            <music-staff-bass>
              <music-note value="A" duration="quarter"></music-note>
            </music-staff-bass>
          </music-measure>
          <music-measure>
            <music-staff-treble>
              <music-note value="A" duration="quarter"></music-note>
              <music-note value="A" duration="quarter"></music-note>
            </music-staff-treble>
            <music-staff-guitar-tab></music-staff-guitar-tab>
          </music-measure>
        </music-composition>
      </main>
    </div>
  );
}
