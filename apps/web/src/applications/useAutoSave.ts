import { useEffect, useRef, useState } from 'react';

export type SaveState = 'saved' | 'pending' | 'saving' | 'error';

/**
 * Guarda `value` un momento después del último cambio. Si el componente se desmonta con un cambio
 * pendiente (p. ej. al pasar a otro paso), lo guarda en ese momento.
 */
export function useAutoSave<T>(
  value: T,
  save: (value: T) => Promise<unknown>,
  delayMs = 600,
): SaveState {
  const [state, setState] = useState<SaveState>('saved');
  const saved = useRef(JSON.stringify(value));
  const pending = useRef<T | null>(null);
  const saveRef = useRef(save);
  useEffect(() => {
    saveRef.current = save;
  });

  const flush = () => {
    const next = pending.current;
    if (next === null) return;
    pending.current = null;
    const serialized = JSON.stringify(next);
    setState('saving');
    saveRef.current(next).then(
      () => {
        saved.current = serialized;
        if (pending.current === null) setState('saved');
      },
      () => setState('error'),
    );
  };

  useEffect(() => {
    if (JSON.stringify(value) === saved.current) return;
    pending.current = value;
    setState('pending');
    const timer = setTimeout(flush, delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  useEffect(() => () => flush(), []);

  return state;
}
