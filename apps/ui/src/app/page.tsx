'use client';

import '@rest-in-time/design-system';
import type {} from '@rest-in-time/design-system';
import { type DurationType, type Note } from '@rest-in-time/design-system';
import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const staffRef = useRef<HTMLElement>(null);

  const [chords, setChords] = useState<
    { values: Note[]; duration: DurationType }[]
  >([
    { values: ['C', 'E'], duration: 'eighth' },
    { values: ['A', 'D'], duration: 'eighth' },
  ]);

  useEffect(() => {
    const staff = staffRef.current;
    if (!staff) return;

    const onReorder = (e: Event) => {
      const { fromIndex, toIndex } = (e as CustomEvent).detail;
      setChords((prev) => {
        const next = [...prev];
        const [moved] = next.splice(fromIndex, 1);
        next.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, moved);
        return next;
      });
      console.log(`Moved note from position ${fromIndex} to ${toIndex}`);
    };

    staff.addEventListener('note-reorder', onReorder);
    return () => staff.removeEventListener('note-reorder', onReorder);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans">
      <music-composition keySig="D" mode="major" time="4/4">
        <music-measure>
          <music-staff-treble editable ref={staffRef}>
            {chords.map((c, i) => (
              <music-chord key={i} duration={c.duration}>
                <music-note value={c.values[0]}></music-note>
                <music-note value={c.values[1]}></music-note>
              </music-chord>
            ))}
          </music-staff-treble>
          <music-staff-bass>
            <music-note value="A" duration="quarter"></music-note>
          </music-staff-bass>
        </music-measure>
        <music-measure>
          <music-staff-treble>
            <music-note value="A" duration="thirtysecond"></music-note>
            <music-note value="D" duration="eighth"></music-note>
          </music-staff-treble>
          <music-staff-bass>
            <music-note value="A" duration="quarter"></music-note>
            <music-note value="A" duration="quarter"></music-note>
          </music-staff-bass>
        </music-measure>
        <music-measure>
          <music-staff-treble>
            <music-note value="A" duration="quarter"></music-note>
            <music-note value="A" duration="quarter"></music-note>
            <music-note value="A" duration="quarter"></music-note>
            <music-note value="A" duration="quarter"></music-note>
          </music-staff-treble>
          <music-staff-bass>
            <music-note value="A" duration="quarter"></music-note>
          </music-staff-bass>
          <music-staff-guitar-tab></music-staff-guitar-tab>
        </music-measure>
      </music-composition>
    </main>
  );
}
