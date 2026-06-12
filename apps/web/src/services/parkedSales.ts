import { db } from "@/services/db";
import type { ParkedSale } from "@/stores/posCartStore";

/**
 * Local store for parked (held) POS sales (W19) — Dexie-backed, terminal-local, never synced. A
 * cashier holds one basket to serve another and resumes it later; the snapshot survives reload.
 */
export const parkedSales = {
  /** Most-recent first — the resume list shows the freshest holds on top. */
  list: () => db.parkedSales.orderBy("parkedAt").reverse().toArray(),
  save: async (sale: ParkedSale) => {
    await db.parkedSales.put(sale);
  },
  remove: async (id: string) => {
    await db.parkedSales.delete(id);
  },
};
