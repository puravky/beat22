import { useEffect, useState } from 'react';

// Debounces a fast-changing value (e.g. search input) so we don't fire
// a network request on every keystroke.
export function useDebouncedValue(value, delayMs = 350) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const handle = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(handle);
  }, [value, delayMs]);

  return debounced;
}
