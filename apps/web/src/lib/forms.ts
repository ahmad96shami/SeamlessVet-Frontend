import type { KeyboardEvent } from "react";

/**
 * Stop Enter from triggering a form's implicit submit when it fires inside a text input.
 * Barcode / keyboard-wedge scanners end every scan with an Enter keystroke; in a multi-field
 * dialog that would submit (and close) the form before the user is done entering. Spread onto the
 * `<form>` as `onKeyDown`. Only single-line `<input>` elements are swallowed — textareas keep
 * Enter=newline, the submit button keeps Enter/Space=activate, and portalled pickers
 * (Combobox / native Select menus) never bubble here, so they keep their own key handling.
 */
export function preventEnterSubmit(e: KeyboardEvent<HTMLFormElement>) {
  if (e.key !== "Enter") return;
  if ((e.target as HTMLElement).tagName === "INPUT") e.preventDefault();
}

/**
 * Drop keys whose value is a blank/whitespace-only string, so optional text inputs left empty are
 * omitted from a request body (the backend then stores null rather than ""). Numbers, booleans, and
 * non-empty strings pass through. Required fields are validated before submit, so they're never blank.
 */
export function omitEmptyStrings<T extends Record<string, unknown>>(obj: T): T {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" && value.trim() === "") continue;
    out[key] = value;
  }
  return out as T;
}
