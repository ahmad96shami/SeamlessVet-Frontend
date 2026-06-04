import { create } from "zustand";

/**
 * The app dialog service — the design-system replacement for RN's native
 * `Alert.alert` (which renders platform chrome: Material on Android, UIKit on
 * iOS, neither matching the design). `DialogHost` (mounted once in the root
 * layout) renders the queue head as a styled Dialog; this store is plain TS so
 * non-component code can raise dialogs too.
 *
 * - `dialog.alert(title, message?)` — one OK button; resolves on dismiss.
 * - `dialog.confirm({ ... })` — cancel + confirm; resolves `true` only on
 *   confirm (backdrop tap / hardware back resolve `false`, like cancel).
 * - `dialog.choose(title, options)` — stacked option buttons + cancel;
 *   resolves the picked option's `value`, or `null` on dismiss.
 *
 * Requests queue FIFO — a second dialog raised while one is open shows after
 * it closes (matching native Alert's stacking on Android).
 */
export interface DialogOption {
  label: string;
  value: string;
}

export interface DialogRequest {
  id: number;
  kind: "alert" | "confirm" | "choose";
  title: string;
  message?: string;
  /** DialogHost defaults it: alert → t("actions.ok"), confirm → required at the call site. */
  confirmLabel?: string;
  /** DialogHost defaults it to t("actions.cancel"). */
  cancelLabel?: string;
  /** Rose confirm button for destructive actions (delete / discard / sign-out). */
  destructive?: boolean;
  /** `choose` only. */
  options?: DialogOption[];
  resolve: (result: boolean | string) => void;
}

interface DialogState {
  queue: DialogRequest[];
  push: (req: Omit<DialogRequest, "id">) => void;
  /** Resolve + drop a request (DialogHost calls this after the exit animation). */
  settle: (id: number, result: boolean | string) => void;
}

let nextId = 1;

export const useDialogStore = create<DialogState>((set, get) => ({
  queue: [],
  push: (req) => set((s) => ({ queue: [...s.queue, { ...req, id: nextId++ }] })),
  settle: (id, result) => {
    const req = get().queue.find((r) => r.id === id);
    if (!req) return;
    set((s) => ({ queue: s.queue.filter((r) => r.id !== id) }));
    req.resolve(result);
  },
}));

export const dialog = {
  alert(title: string, message?: string, confirmLabel?: string): Promise<void> {
    return new Promise((resolve) => {
      useDialogStore
        .getState()
        .push({ kind: "alert", title, message, confirmLabel, resolve: () => resolve() });
    });
  },
  confirm(opts: {
    title: string;
    message?: string;
    confirmLabel: string;
    cancelLabel?: string;
    destructive?: boolean;
  }): Promise<boolean> {
    return new Promise((resolve) => {
      useDialogStore.getState().push({ kind: "confirm", ...opts, resolve: (r) => resolve(r === true) });
    });
  },
  choose(title: string, options: DialogOption[], cancelLabel?: string): Promise<string | null> {
    return new Promise((resolve) => {
      useDialogStore.getState().push({
        kind: "choose",
        title,
        options,
        cancelLabel,
        resolve: (r) => resolve(typeof r === "string" ? r : null),
      });
    });
  },
};
