import { getCollection } from "../data/store.js";
import { prisma } from "../prisma.js";
import { DEFAULT_OVERHEAD_RULES, OVERHEAD_RULES_CONFIG_KEY } from "./overheadDefaults.js";

export { DEFAULT_OVERHEAD_RULES, OVERHEAD_RULES_CONFIG_KEY };

function parseRules(value) {
  if (!value) {
    return DEFAULT_OVERHEAD_RULES;
  }
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) && parsed.length ? parsed : DEFAULT_OVERHEAD_RULES;
  } catch (_error) {
    return DEFAULT_OVERHEAD_RULES;
  }
}

export async function getEngagementOverheadRules() {
  try {
    const config = await prisma.systemConfig.findUnique({
      where: { key: OVERHEAD_RULES_CONFIG_KEY }
    });
    if (config) {
      return parseRules(config.value);
    }
  } catch (_error) {
    // Local JSON mode can run before Postgres is reachable.
  }

  const localConfig = getCollection("systemConfigs").find((item) => item.key === OVERHEAD_RULES_CONFIG_KEY);
  return parseRules(localConfig?.value);
}

export function normalizeOverheadRule(rule) {
  return {
    id: rule.id || crypto.randomUUID(),
    engagementType: rule.engagementType || "Default",
    locationType: rule.locationType || "Default",
    overheadPercent: Number(rule.overheadPercent || 0),
    hourlyAddOn: Number(rule.hourlyAddOn || 0),
    active: rule.active !== false
  };
}

export function findOverheadRule(rules, engagementType, locationType) {
  const normalizedEngagement = engagementType || "Default";
  const normalizedLocation = locationType || "Default";
  const normalizedRules = (rules?.length ? rules : DEFAULT_OVERHEAD_RULES).map(normalizeOverheadRule);
  return (
    normalizedRules.find((rule) =>
      rule.active !== false &&
      rule.engagementType === normalizedEngagement &&
      rule.locationType === normalizedLocation
    ) ||
    normalizedRules.find((rule) => rule.active !== false && rule.engagementType === "Default" && rule.locationType === "Default") ||
    normalizeOverheadRule(DEFAULT_OVERHEAD_RULES.at(-1))
  );
}

export function applyOverheadToBaseCost(baseCost, rules, engagementType, locationType) {
  const base = Number(baseCost || 0);
  const rule = findOverheadRule(rules, engagementType, locationType);
  return Number((base * (1 + Number(rule.overheadPercent || 0) / 100) + Number(rule.hourlyAddOn || 0)).toFixed(2));
}

export function removeOverheadFromLoadedCost(loadedCost, rules, engagementType, locationType) {
  const loaded = Number(loadedCost || 0);
  const rule = findOverheadRule(rules, engagementType, locationType);
  const divisor = 1 + Number(rule.overheadPercent || 0) / 100;
  return Number((Math.max(0, loaded - Number(rule.hourlyAddOn || 0)) / divisor).toFixed(2));
}
