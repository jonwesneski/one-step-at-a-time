import { createFileRoute } from '@tanstack/react-router';
import { ClientOnly } from '../components/ClientOnly';
import MusicScore from '../components/MusicScore';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans">
      <ClientOnly>
        <MusicScore />
      </ClientOnly>
    </main>
  );
}
