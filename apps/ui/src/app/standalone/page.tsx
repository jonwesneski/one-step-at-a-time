'use client';

import dynamic from 'next/dynamic';

const StandAlone = dynamic(() => import('./StandAlone'), { ssr: false });

export default function Page() {
  return <StandAlone />;
}
