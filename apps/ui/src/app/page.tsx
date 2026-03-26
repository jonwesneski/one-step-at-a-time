'use client';

import dynamic from 'next/dynamic';

const MusicScore = dynamic(() => import('./MusicScore'), { ssr: false });

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans">
      <MusicScore />
    </main>
  );
}
