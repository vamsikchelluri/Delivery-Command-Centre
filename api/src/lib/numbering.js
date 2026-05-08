const counters = new Map();

export function generateNumber(prefix, year = new Date().getFullYear(), width = 6) {
  const key = `${prefix}-${year}`;
  const next = (counters.get(key) || 0) + 1;
  counters.set(key, next);
  return `${prefix}-${year}-${String(next).padStart(width, "0")}`;
}

export function hydrateCounter(prefix, rawValues) {
  const year = new Date().getFullYear();
  const key = `${prefix}-${year}`;
  const maxSeen = rawValues.reduce((maxValue, current) => {
    const match = current?.match(/(\d+)$/);
    return match ? Math.max(maxValue, Number(match[1])) : maxValue;
  }, 0);
  counters.set(key, maxSeen);
}
