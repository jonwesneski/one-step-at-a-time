import { useCallback, useState } from 'react';

export function useUndoRedo<T>(getValue: () => T, setValue: (v: T) => void) {
  const [past, setPast] = useState<T[]>([]);
  const [future, setFuture] = useState<T[]>([]);

  // Call instead of setValue directly — snapshots current state first
  const record = useCallback(
    (newValue: T) => {
      // Capture snapshot synchronously before setValue mutates the external store.
      // If getValue() were called inside the functional updater instead, React would
      // invoke it during the render phase — after setValue has already run — and
      // the snapshot would capture the post-mutation state instead of the pre-mutation state.
      const snapshot = getValue();
      setPast((p) => [...p, snapshot]);
      setFuture([]);
      setValue(newValue);
    },
    [getValue, setValue]
  );

  const undo = useCallback(() => {
    if (past.length === 0) return;
    const current = getValue();
    setFuture((f) => [current, ...f]);
    setValue(past[past.length - 1]);
    setPast((p) => p.slice(0, -1));
  }, [past, getValue, setValue]);

  const redo = useCallback(() => {
    if (future.length === 0) return;
    const current = getValue();
    setPast((p) => [...p, current]);
    setValue(future[0]);
    setFuture((f) => f.slice(1));
  }, [future, getValue, setValue]);

  return { record, undo, redo, canUndo: past.length > 0, canRedo: future.length > 0 };
}
