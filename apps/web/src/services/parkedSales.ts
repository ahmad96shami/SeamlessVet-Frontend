import { getDb } from "@/services/db";
import type { ParkedSale } from "@/stores/posCartStore";

/**
 * Local store for parked (held) POS sales (W19) — Dexie-backed, terminal-local, never synced. A
 * cashier holds one basket to serve another and resumes it later; the snapshot survives reload.
 * Per-tenant since W24: {@link getDb} resolves the active center's DB, so holds never leak across
 * centers on a shared browser.
 */
export const parkedSales = {
  /** Most-recent first — the resume list shows the freshest holds on top. */
  list: () => getDb().parkedSales.orderBy("parkedAt").reverse().toArray(),
  save: async (sale: ParkedSale) => {
    await getDb().parkedSales.put(sale);
  },
  remove: async (id: string) => {
    await getDb().parkedSales.delete(id);
  },
};
