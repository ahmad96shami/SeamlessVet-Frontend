import { useEffect, useRef } from "react";
import type { FieldValues, UseFormReturn } from "react-hook-form";

/**
 * Debounced section autosave for a react-hook-form. Subscribes to user edits (skipping the
 * programmatic `reset()` / `setValue` echoes that carry no field `name`), waits `delayMs` after the
 * last keystroke, validates through the form resolver, and calls `onValid` with the parsed values —
 * replacing an explicit save button. Invalid input never fires a save: the resolver rejects it and
 * surfaces field errors instead (pair with `shouldFocusError: false` so a mid-typing rejection
 * doesn't yank focus).
 */
export function useAutosave<T extends FieldValues>(
  form: UseFormReturn<T>,
  onValid: (values: T) => void,
  { enabled = true, delayMs = 700 }: { enabled?: boolean; delayMs?: number } = {},
) {
  // Keep the latest callback without re-subscribing the watcher on every render.
  const onValidRef = useRef(onValid);
  onValidRef.current = onValid;

  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const run = form.handleSubmit((values) => onValidRef.current(values));
    const subscription = form.watch((_values, { name }) => {
      if (!name) return; // reset()/programmatic writes carry no field name — never a user edit
      clearTimeout(timer);
      timer = setTimeout(() => void run(), delayMs);
    });
    return () => {
      subscription.unsubscribe();
      clearTimeout(timer);
    };
  }, [form, enabled, delayMs]);
}
