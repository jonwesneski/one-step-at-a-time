import { ClientOnly } from '@/components/ClientOnly';
import { CompositionInput } from '@/components/compositionForm';
import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  head: () => ({
    meta: [{ title: 'New | One Step at a Time' }],
  }),
  component: Home,
});

function Home() {
  return (
    <ClientOnly>
      <CompositionInput />
    </ClientOnly>
  );
}
