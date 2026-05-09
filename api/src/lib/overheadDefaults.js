export const OVERHEAD_RULES_CONFIG_KEY = "engagementOverheadRules";

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
