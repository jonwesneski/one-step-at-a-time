import { createFileRoute } from '@tanstack/react-router';
import { ClientOnly } from '../components/ClientOnly';
import { CompositionInput } from '../components/compositionForm';

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
