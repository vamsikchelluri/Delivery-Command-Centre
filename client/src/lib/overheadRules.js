export const DEFAULT_OVERHEAD_RULES = [
  { id: "oh_full_onsite", engagementType: "Full-Time", locationType: "Onsite", overheadPercent: 12.5, hourlyAddOn: 2, active: true },
  { id: "oh_full_offshore", engagementType: "Full-Time", locationType: "Offshore", overheadPercent: 25, hourlyAddOn: 0, active: true },
  { id: "oh_full_nearshore", engagementType: "Full-Time", locationType: "Nearshore", overheadPercent: 12.5, hourlyAddOn: 2, active: true },
  { id: "oh_part_onsite", engagementType: "Part-Time", locationType: "Onsite", overheadPercent: 12.5, hourlyAddOn: 2, active: true },
  { id: "oh_part_offshore", engagementType: "Part-Time", locationType: "Offshore", overheadPercent: 25, hourlyAddOn: 0, active: true },
  { id: "oh_part_nearshore", engagementType: "Part-Time", locationType: "Nearshore", overheadPercent: 12.5, hourlyAddOn: 2, active: true },
  { id: "oh_contractor_onsite", engagementType: "Contractor", locationType: "Onsite", overheadPercent: 0, hourlyAddOn: 2, active: true },
  { id: "oh_contractor_offshore", engagementType: "Contractor", locationType: "Offshore", overheadPercent: 0, hourlyAddOn: 2, active: true },
  { id: "oh_contractor_nearshore", engagementType: "Contractor", locationType: "Nearshore", overheadPercent: 0, hourlyAddOn: 2, active: true },
  { id: "oh_c2c_onsite", engagementType: "C2C", locationType: "Onsite", overheadPercent: 0, hourlyAddOn: 2, active: true },
  { id: "oh_c2c_offshore", engagementType: "C2C", locationType: "Offshore", overheadPercent: 0, hourlyAddOn: 2, active: true },
  { id: "oh_c2c_nearshore", engagementType: "C2C", locationType: "Nearshore", overheadPercent: 0, hourlyAddOn: 2, active: true },
  { id: "oh_default", engagementType: "Default", locationType: "Default", overheadPercent: 20, hourlyAddOn: 0, active: true }
];

export const ENGAGEMENT_TYPES = ["Full-Time", "Part-Time", "Contractor", "C2C"];
export const LOCATION_TYPES = ["Onsite", "Offshore", "Nearshore"];

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
