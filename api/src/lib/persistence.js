import { flushStoreWrites } from "../data/store.js";

export async function ensurePersisted(res) {
  try {
    await flushStoreWrites();
    return true;
  } catch (error) {
    res.status(500).json({
      message: "Save failed. The change was not persisted to Postgres.",
      detail: error?.code || error?.message || "Persistence failure"
    });
    return false;
  }
}
