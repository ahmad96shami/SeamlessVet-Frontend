/** Trigger a browser download for a fetched blob (web-only DOM concern; kept out of `@vet/shared`). */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revoke on the next tick so the click has dispatched.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
