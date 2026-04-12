import { createFileRoute } from '@tanstack/react-router';
import { ClientOnly } from '../components/ClientOnly';
import { CompositionEditor } from '../components/compositionForm';

export const Route = createFileRoute('/')({
  component: Home,
});

function Home() {
  return (
    <main className="min-h-screen bg-zinc-50 font-sans p-6">
      <ClientOnly>
        <CompositionEditor />
      </ClientOnly>
    </main>
  );
}
