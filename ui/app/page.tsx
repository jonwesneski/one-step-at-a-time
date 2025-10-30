import Measure from "./_components/Measure";
export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-wrap min-h-screen w-full max-w-3xl py-32 bg-white dark:bg-black">
        <Measure />
        <Measure />
      </main>
    </div>
  );
}
