import { ClientOnly } from '@/components/ClientOnly';
import MusicScore from '@/components/MusicScore';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/sample')({
  component: Home,
});

function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas font-sans">
      <ClientOnly>
        <MusicScore />
      </ClientOnly>
    </main>
  );
}
