import { getCollection } from "../data/store.js";

export function getSystemConfigNumber(key, fallback) {
  const record = getCollection("systemConfigs").find((item) => item.key === key);
  const value = Number(record?.value);
  return Number.isFinite(value) ? value : fallback;
}

export function standardManMonthHours() {
  return getSystemConfigNumber("standardManMonthHours", 168);
}
