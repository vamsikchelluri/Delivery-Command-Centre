const permissionFeatures = [
  { id: "feature_command_center", key: "commandCenter", name: "Command Center", category: "Navigation", actions: ["view"] },
  { id: "feature_clients", key: "clients", name: "Clients", category: "Core", actions: ["view", "create", "edit", "delete", "export"] },
  { id: "feature_resources", key: "resources", name: "Resources", category: "Core", actions: ["view", "create", "edit", "delete", "export"] },
  { id: "feature_resource_costing", key: "resourceCosting", name: "Resource Costing", category: "Sensitive", actions: ["view", "edit"] },
  { id: "feature_opportunities", key: "opportunities", name: "Pipeline", category: "Core", actions: ["view", "create", "edit", "delete", "export"] },
  { id: "feature_sows", key: "sows", name: "SOWs", category: "Core", actions: ["view", "create", "edit", "delete", "export"] },
  { id: "feature_sow_financials", key: "sowFinancials", name: "SOW Financials", category: "Sensitive", actions: ["view", "viewCost", "viewMargin", "export"] },
  { id: "feature_actuals", key: "actuals", name: "Actuals", category: "Delivery", actions: ["view", "create", "edit", "export"] },
  { id: "feature_resource_planning", key: "resourcePlanning", name: "Resource Planning", category: "Delivery", actions: ["view", "export"] },
  { id: "feature_financial_cockpit", key: "financialCockpit", name: "Financial Cockpit", category: "Finance", actions: ["view", "export"] },
  { id: "feature_attachments", key: "attachments", name: "Attachments", category: "Core", actions: ["view", "create", "edit", "delete"] },
  { id: "feature_master_data", key: "masterData", name: "Master Data", category: "Admin", actions: ["view", "create", "edit", "delete"] },
  { id: "feature_audit_logs", key: "auditLogs", name: "Audit Logs", category: "Admin", actions: ["view", "export"] },
  { id: "feature_admin", key: "admin", name: "Admin", category: "Admin", actions: ["view", "create", "edit", "delete"] }
];

const defaultRoleActions = {
  "Super Admin": ["*"],
  COO: ["*"],
  "Vice President": ["commandCenter:*", "clients:*", "resources:*", "resourceCosting:view", "opportunities:*", "sows:*", "sowFinancials:*", "actuals:*", "resourcePlanning:*", "financialCockpit:*", "attachments:*", "auditLogs:*"],
  Director: ["commandCenter:*", "clients:*", "resources:*", "resourceCosting:view", "opportunities:*", "sows:*", "sowFinancials:*", "actuals:*", "resourcePlanning:*", "financialCockpit:*", "attachments:*", "auditLogs:*"],
  "Delivery Manager": ["commandCenter:view", "clients:view", "resources:*", "resourceCosting:view", "opportunities:view", "sows:*", "sowFinancials:*", "actuals:*", "resourcePlanning:*", "financialCockpit:view", "attachments:*", "auditLogs:view"],
  "Project Manager": ["commandCenter:view", "clients:view", "resources:view", "opportunities:view", "sows:view", "actuals:*", "resourcePlanning:view", "attachments:view"],
  "Account Manager": ["commandCenter:view", "clients:*", "resources:view", "opportunities:*", "sows:view", "sowFinancials:view", "attachments:view"],
  "Finance Viewer": ["commandCenter:view", "clients:view", "resources:view", "resourceCosting:view", "opportunities:view", "sows:view", "sowFinancials:*", "actuals:view", "resourcePlanning:view", "financialCockpit:*", "attachments:view", "auditLogs:view"]
};

function actionAllowed(roleName, featureKey, action) {
  const grants = defaultRoleActions[roleName] || [];
  return grants.includes("*") || grants.includes(`${featureKey}:*`) || grants.includes(`${featureKey}:${action}`);
}

function buildDefaultRolePermissions(roles) {
  return roles.flatMap((role) => permissionFeatures.flatMap((feature) =>
    feature.actions.map((action) => ({
      id: `perm_${role.id}_${feature.key}_${action}`.replace(/[^a-zA-Z0-9_]/g, "_"),
      roleId: role.id,
      roleName: role.name,
      featureKey: feature.key,
      action,
      allowed: actionAllowed(role.name, feature.key, action)
    }))
  ));
}

const appRoles = [
  { id: "role_coo", name: "COO", canViewCost: true, canViewMargin: true, active: true },
  { id: "role_vp", name: "Vice President", canViewCost: true, canViewMargin: true, active: true },
  { id: "role_director", name: "Director", canViewCost: true, canViewMargin: true, active: true },
  { id: "role_dm", name: "Delivery Manager", canViewCost: true, canViewMargin: true, active: true },
  { id: "role_pm", name: "Project Manager", canViewCost: false, canViewMargin: false, active: true },
  { id: "role_am", name: "Account Manager", canViewCost: true, canViewMargin: false, active: true },
  { id: "role_fin", name: "Finance Viewer", canViewCost: true, canViewMargin: true, active: true },
  { id: "role_admin", name: "Super Admin", canViewCost: true, canViewMargin: true, active: true }
];

export const seedData = {
  skills: [
    {
      id: "skill_fico",
      number: "SKL-2026-000001",
      name: "SAP FICO",
      subModules: ["GL", "AP", "AR", "AA", "CO", "Bank Accounting"],
      active: true
    },
    {
      id: "skill_sd",
      number: "SKL-2026-000002",
      name: "SAP SD",
      subModules: ["Order to Cash", "Pricing", "Billing", "Credit Management", "Logistics Execution"],
      active: true
    },
    {
      id: "skill_mm",
      number: "SKL-2026-000003",
      name: "SAP MM",
      subModules: ["Procure to Pay", "Inventory Management", "Purchasing", "Material Master"],
      active: true
    },
    {
      id: "skill_abap",
      number: "SKL-2026-000004",
      name: "SAP ABAP",
      subModules: ["Reports", "Interfaces", "Enhancements", "Forms", "CDS Views", "OData"],
      active: true
    },
    {
      id: "skill_basis",
      number: "SKL-2026-000005",
      name: "SAP Basis",
      subModules: ["S/4 Upgrade", "Security", "Transport Management", "Performance", "HANA Admin"],
      active: true
    },
    {
      id: "skill_s4",
      number: "SKL-2026-000006",
      name: "SAP S/4HANA",
      subModules: ["Migration", "Central Finance", "Embedded Analytics", "Activate", "Fiori"],
      active: true
    },
    {
      id: "skill_ewm",
      number: "SKL-2026-000007",
      name: "SAP EWM",
      subModules: ["Inbound", "Outbound", "Warehouse Monitor", "RF", "Labor Management"],
      active: true
    },
    {
      id: "skill_successfactors",
      number: "SKL-2026-000008",
      name: "SAP SuccessFactors",
      subModules: ["Employee Central", "Recruiting", "Onboarding", "Performance", "Compensation"],
      active: true
    },
    {
      id: "skill_ariba",
      number: "SKL-2026-000009",
      name: "SAP Ariba",
      subModules: ["Sourcing", "Contracts", "Buying", "Supplier Lifecycle", "Integration"],
      active: true
    },
    {
      id: "skill_btp",
      number: "SKL-2026-000010",
      name: "SAP BTP",
      subModules: ["CAP", "Integration Suite", "Extension Suite", "Workflow", "Build Apps"],
      active: true
    }
  ],
  currencies: [
    { id: "cur_usd", code: "USD", name: "US Dollar", fxToUsd: 1, active: true },
    { id: "cur_inr", code: "INR", name: "Indian Rupee", fxToUsd: 88, active: true },
    { id: "cur_gbp", code: "GBP", name: "British Pound", fxToUsd: 0.8, active: true },
    { id: "cur_eur", code: "EUR", name: "Euro", fxToUsd: 0.92, active: true },
    { id: "cur_cad", code: "CAD", name: "Canadian Dollar", fxToUsd: 1.36, active: true },
    { id: "cur_aud", code: "AUD", name: "Australian Dollar", fxToUsd: 1.53, active: true },
    { id: "cur_sgd", code: "SGD", name: "Singapore Dollar", fxToUsd: 1.35, active: true },
    { id: "cur_aed", code: "AED", name: "UAE Dirham", fxToUsd: 3.67, active: true }
  ],
  regions: [
    { id: "reg_na", code: "NA", name: "North America", sortOrder: 10, active: true },
    { id: "reg_latam", code: "LATAM", name: "LATAM", sortOrder: 20, active: true },
    { id: "reg_europe", code: "EUROPE", name: "Europe", sortOrder: 30, active: true },
    { id: "reg_me", code: "ME", name: "Middle East", sortOrder: 40, active: true },
    { id: "reg_africa", code: "AFRICA", name: "Africa", sortOrder: 50, active: true },
    { id: "reg_india", code: "INDIA", name: "India", sortOrder: 60, active: true },
    { id: "reg_apac", code: "APAC", name: "APAC", sortOrder: 70, active: true },
    { id: "reg_anz", code: "ANZ", name: "ANZ", sortOrder: 80, active: true }
  ],
  locations: [
    { id: "loc_india", name: "India", locationType: "Offshore", defaultCompensationCurrency: "INR", defaultPaymentCurrency: "INR", active: true },
    { id: "loc_usa", name: "USA", locationType: "Onsite", defaultCompensationCurrency: "USD", defaultPaymentCurrency: "USD", active: true },
    { id: "loc_canada", name: "Canada", locationType: "Nearshore", defaultCompensationCurrency: "CAD", defaultPaymentCurrency: "CAD", active: true },
    { id: "loc_uk", name: "UK", locationType: "Onsite", defaultCompensationCurrency: "GBP", defaultPaymentCurrency: "GBP", active: true }
  ],
  experienceLevels: [
    { id: "exp_1", name: "Analyst", fromYears: 0, toYears: 2, active: true },
    { id: "exp_2", name: "Consultant", fromYears: 2, toYears: 5, active: true },
    { id: "exp_3", name: "Senior Consultant", fromYears: 5, toYears: 8, active: true },
    { id: "exp_4", name: "Lead", fromYears: 8, toYears: 12, active: true },
    { id: "exp_5", name: "Manager", fromYears: 10, toYears: 15, active: true },
    { id: "exp_6", name: "Architect", fromYears: 12, toYears: 18, active: true },
    { id: "exp_7", name: "Principal", fromYears: 15, toYears: 25, active: true }
  ],
  systemConfigs: [
    { id: "cfg_hours", key: "standardHoursPerYear", value: "1800", description: "Standard annual productive hours" },
    { id: "cfg_overhead", key: "overheadMultiplier", value: "1.2", description: "Employee overhead multiplier" },
    { id: "cfg_full_deployment", key: "fullDeploymentThreshold", value: "90", description: "Allocation threshold for fully deployed" },
    { id: "cfg_rolloff", key: "defaultRollOffWindowDays", value: "30", description: "Default roll-off alert window" }
  ],
  numberRanges: [
    { id: "nr_acc", objectType: "Account", prefix: "ACC", sequenceLength: 6, nextNumber: 3, includeYear: true, active: true },
    { id: "nr_res", objectType: "Resource", prefix: "RES", sequenceLength: 6, nextNumber: 4, includeYear: true, active: true },
    { id: "nr_opp", objectType: "Opportunity", prefix: "OPP", sequenceLength: 6, nextNumber: 2, includeYear: true, active: true },
    { id: "nr_sow", objectType: "SOW", prefix: "SOW", sequenceLength: 6, nextNumber: 2, includeYear: true, active: true },
    { id: "nr_dpl", objectType: "Deployment", prefix: "DPL", sequenceLength: 6, nextNumber: 3, includeYear: true, active: true },
    { id: "nr_act", objectType: "Actual", prefix: "ACT", sequenceLength: 6, nextNumber: 3, includeYear: true, active: true },
    { id: "nr_aud", objectType: "Audit", prefix: "AUD", sequenceLength: 6, nextNumber: 2, includeYear: true, active: true }
  ],
  appRoles,
  permissionFeatures,
  rolePermissions: buildDefaultRolePermissions(appRoles),
  accounts: [
    {
      id: "acc_1",
      number: "ACC-2026-000001",
      name: "Acme Industries",
      industry: "Manufacturing",
      region: "North America",
      active: true,
      createdAt: "2026-04-23T09:00:00.000Z",
      updatedAt: "2026-04-23T09:00:00.000Z"
    },
    {
      id: "acc_2",
      number: "ACC-2026-000002",
      name: "Globex Retail",
      industry: "Retail",
      region: "Europe",
      active: true,
      createdAt: "2026-04-23T09:00:00.000Z",
      updatedAt: "2026-04-23T09:00:00.000Z"
    }
  ],
  users: [
    {
      id: "usr_1",
      number: "USR-2026-000001",
      name: "Aarav COO",
      email: "coo@dcc.local",
      passwordHash: "$2a$10$50qZJUFiRVc5jmUzE8OoEem3G7esTWvvPmRdQ3ZtrBPGkf644BVyS",
      role: "COO",
      canViewCost: true,
      canViewMargin: true,
      createdAt: "2026-04-23T09:00:00.000Z",
      updatedAt: "2026-04-23T09:00:00.000Z"
    },
    {
      id: "usr_2",
      number: "USR-2026-000002",
      name: "Divya Delivery",
      email: "dm@dcc.local",
      passwordHash: "$2a$10$50qZJUFiRVc5jmUzE8OoEem3G7esTWvvPmRdQ3ZtrBPGkf644BVyS",
      role: "Delivery Manager",
      canViewCost: true,
      canViewMargin: true,
      createdAt: "2026-04-23T09:00:00.000Z",
      updatedAt: "2026-04-23T09:00:00.000Z"
    },
    {
      id: "usr_3",
      number: "USR-2026-000003",
      name: "Rohan Account",
      email: "am@dcc.local",
      passwordHash: "$2a$10$50qZJUFiRVc5jmUzE8OoEem3G7esTWvvPmRdQ3ZtrBPGkf644BVyS",
      role: "Account Manager",
      canViewCost: true,
      canViewMargin: false,
      createdAt: "2026-04-23T09:00:00.000Z",
      updatedAt: "2026-04-23T09:00:00.000Z"
    },
    {
      id: "usr_4",
      number: "USR-2026-000004",
      name: "Priya PM",
      email: "pm@dcc.local",
      passwordHash: "$2a$10$50qZJUFiRVc5jmUzE8OoEem3G7esTWvvPmRdQ3ZtrBPGkf644BVyS",
      role: "Project Manager",
      canViewCost: false,
      canViewMargin: false,
      createdAt: "2026-04-23T09:00:00.000Z",
      updatedAt: "2026-04-23T09:00:00.000Z"
    }
  ],
  resources: [
    {
      id: "res_1",
      number: "RES-2026-000001",
      firstName: "Meera",
      lastName: "Krishnan",
      email: "meera@dcc.local",
      primarySkill: "SAP FICO",
      subModule: "GL, AP, AR",
      location: "Hyderabad",
      locationType: "Offshore",
      employmentType: "Full-Time",
      employmentStatus: "ACTIVE",
      deliveryStatus: "FULLY_DEPLOYED",
      deployedPercent: 100,
      availabilityDate: null,
      deliveryRollOffDate: "2026-07-31T00:00:00.000Z",
      costRate: 42,
      ownerName: "Divya Delivery",
      currentSowName: "Acme S/4 Finance Rollout",
      createdAt: "2026-04-23T09:00:00.000Z",
      updatedAt: "2026-04-23T09:00:00.000Z"
    },
    {
      id: "res_2",
      number: "RES-2026-000002",
      firstName: "Kiran",
      lastName: "Patel",
      email: "kiran@dcc.local",
      primarySkill: "SAP SD",
      subModule: "Order to Cash",
      location: "Bengaluru",
      locationType: "Offshore",
      employmentType: "Contractor",
      employmentStatus: "ACTIVE",
      deliveryStatus: "PARTIALLY_DEPLOYED",
      deployedPercent: 50,
      availabilityDate: "2026-05-01T00:00:00.000Z",
      deliveryRollOffDate: "2026-07-31T00:00:00.000Z",
      costRate: 36,
      ownerName: "Divya Delivery",
      currentSowName: "Acme S/4 Finance Rollout",
      createdAt: "2026-04-23T09:00:00.000Z",
      updatedAt: "2026-04-23T09:00:00.000Z"
    },
    {
      id: "res_3",
      number: "RES-2026-000003",
      firstName: "Ananya",
      lastName: "Rao",
      email: "ananya@dcc.local",
      primarySkill: "SAP Basis",
      subModule: "S/4 Upgrade",
      location: "Pune",
      locationType: "Offshore",
      employmentType: "Full-Time",
      employmentStatus: "ACTIVE",
      deliveryStatus: "AVAILABLE",
      deployedPercent: 0,
      availabilityDate: "2026-04-23T00:00:00.000Z",
      deliveryRollOffDate: null,
      costRate: 31,
      ownerName: "Divya Delivery",
      currentSowName: "",
      createdAt: "2026-04-23T09:00:00.000Z",
      updatedAt: "2026-04-23T09:00:00.000Z"
    }
  ],
  opportunities: [
    {
      id: "opp_1",
      number: "OPP-2026-000001",
      accountId: "acc_1",
      name: "Acme Finance Transformation Wave 2",
      stage: "NEGOTIATING",
      probability: 70,
      estimatedRevenue: 185000,
      roleEstimatedRevenue: 165000,
      weightedValue: 129500,
      currency: "USD",
      expectedCloseDate: "2026-05-15T00:00:00.000Z",
      expectedStartDate: "2026-06-01T00:00:00.000Z",
      expectedEndDate: "2026-10-31T00:00:00.000Z",
      source: "Existing Client",
      targetMargin: 32,
      accountManagerName: "Rohan Account",
      deliveryManagerName: "Divya Delivery",
      dealType: "Expansion",
      notes: "Strong buying intent. Commercials under review.",
      notesHistory: [
        {
          id: "opnote_1",
          author: "Rohan Account",
          timestamp: "2026-04-23T09:30:00.000Z",
          note: "Client confirmed budget range and requested revised commercials."
        },
        {
          id: "opnote_2",
          author: "Divya Delivery",
          timestamp: "2026-04-24T11:00:00.000Z",
          note: "Delivery team validated SAP FICO lead availability for the expected start window."
        }
      ],
      createdAt: "2026-04-23T09:00:00.000Z",
      updatedAt: "2026-04-23T09:00:00.000Z"
    }
  ],
  opportunityRoles: [
    {
      id: "oppr_1",
      number: "OPP-2026-000001-01",
      opportunityId: "opp_1",
      title: "SAP FICO Lead",
      skill: "SAP FICO",
      subModule: "GL, AP, AR",
      quantity: 1,
      engagementType: "Full-Time",
      experienceLevel: "Lead",
      startDate: "2026-06-01T00:00:00.000Z",
      duration: 4,
      endDate: "2026-09-30T00:00:00.000Z",
      roleLocation: "Offshore",
      estimatedHours: 640,
      billRate: 115,
      targetMargin: 32,
      loadedCostGuidance: 78.2,
      baseCostGuidance: 65.17,
      costGuidance: 78.2,
      allocationPercent: 100,
      resourceIdentificationStatus: "Identified",
      candidateResourceName: "Meera Krishnan",
      notes: ""
    },
    {
      id: "oppr_2",
      number: "OPP-2026-000001-02",
      opportunityId: "opp_1",
      title: "SAP SD Consultant",
      skill: "SAP SD",
      subModule: "Order to Cash",
      quantity: 1,
      engagementType: "Part-Time",
      experienceLevel: "Consultant",
      startDate: "2026-06-15T00:00:00.000Z",
      duration: 3,
      endDate: "2026-09-15T00:00:00.000Z",
      roleLocation: "Offshore",
      estimatedHours: 240,
      billRate: 95,
      targetMargin: 32,
      loadedCostGuidance: 64.6,
      baseCostGuidance: 53.83,
      costGuidance: 64.6,
      allocationPercent: 50,
      resourceIdentificationStatus: "Identified",
      candidateResourceName: "Kiran Patel",
      notes: ""
    }
  ],
  sows: [
    {
      id: "sow_1",
      number: "SOW-2026-000001",
      accountId: "acc_1",
      sourceOpportunityId: null,
      name: "Acme S/4 Finance Rollout",
      billingModel: "TM_HOURLY",
      status: "ACTIVE",
      currency: "USD",
      startDate: "2026-04-01T00:00:00.000Z",
      endDate: "2026-07-31T00:00:00.000Z",
      contractValue: 250000,
      visibleRevenue: 98250,
      visibleCost: 42100,
      grossMargin: 56150,
      grossMarginPercent: 57.15,
      projectHealth: "Green",
      projectManagerName: "Priya PM",
      deliveryManagerName: "Divya Delivery",
      accountManagerName: "Rohan Account",
      parentSowReference: "",
      createdFrom: "DIRECT",
      createdAt: "2026-04-23T09:00:00.000Z",
      updatedAt: "2026-04-23T09:00:00.000Z"
    }
  ],
  sowRoles: [
    {
      id: "sowr_1",
      number: "SOW-2026-000001-01",
      sowId: "sow_1",
      sourceOpportunityRoleId: null,
      title: "SAP FICO Lead",
      skill: "SAP FICO",
      subModule: "GL, AP, AR",
      quantity: 1,
      engagementType: "Full-Time",
      experienceLevel: "Lead",
      billingType: "Hourly",
      billRate: 115,
      costRate: 42,
      targetMargin: 32,
      loadedCostGuidance: 78.2,
      baseCostGuidance: 65.17,
      startDate: "2026-04-01T00:00:00.000Z",
      duration: 4,
      endDate: "2026-07-31T00:00:00.000Z",
      plannedAllocationPercent: 100,
      plannedHours: 640,
      locationRequirement: "Offshore",
      staffingPriority: "High",
      staffingStatus: "Fully Staffed",
      remarks: "",
      measurementUnit: "HOURS"
    },
    {
      id: "sowr_2",
      number: "SOW-2026-000001-02",
      sowId: "sow_1",
      sourceOpportunityRoleId: null,
      title: "SAP SD Consultant",
      skill: "SAP SD",
      subModule: "Order to Cash",
      quantity: 1,
      engagementType: "Part-Time",
      experienceLevel: "Consultant",
      billingType: "Hourly",
      billRate: 95,
      costRate: 36,
      targetMargin: 32,
      loadedCostGuidance: 64.6,
      baseCostGuidance: 53.83,
      startDate: "2026-04-01T00:00:00.000Z",
      duration: 4,
      endDate: "2026-07-31T00:00:00.000Z",
      plannedAllocationPercent: 50,
      plannedHours: 320,
      locationRequirement: "Offshore",
      staffingPriority: "Medium",
      staffingStatus: "Partially Staffed",
      remarks: "",
      measurementUnit: "HOURS"
    }
  ],
  deployments: [
    {
      id: "dpl_1",
      number: "DPL-2026-000001",
      sowRoleId: "sowr_1",
      resourceId: "res_1",
      startDate: "2026-04-01T00:00:00.000Z",
      endDate: "2026-07-31T00:00:00.000Z",
      allocationPercent: 100,
      status: "ACTIVE",
      lockedCostRate: 42,
      lockedBillRate: 115,
      billable: true,
      sourceOfAssignment: "Direct Staffing"
    },
    {
      id: "dpl_2",
      number: "DPL-2026-000002",
      sowRoleId: "sowr_2",
      resourceId: "res_2",
      startDate: "2026-04-01T00:00:00.000Z",
      endDate: "2026-07-31T00:00:00.000Z",
      allocationPercent: 50,
      status: "ACTIVE",
      lockedCostRate: 36,
      lockedBillRate: 95,
      billable: true,
      sourceOfAssignment: "Direct Staffing"
    }
  ],
  actuals: [
    {
      id: "act_1",
      number: "ACT-2026-000001",
      deploymentId: "dpl_1",
      month: "2026-04-01T00:00:00.000Z",
      actualQuantity: 160,
      actualUnit: "HOURS",
      remarks: "Uploaded via seed",
      uploadBatchRef: "ACT-2026-000001",
      enteredBy: "Priya PM",
      enteredDate: "2026-04-25T00:00:00.000Z"
    },
    {
      id: "act_2",
      number: "ACT-2026-000002",
      deploymentId: "dpl_2",
      month: "2026-04-01T00:00:00.000Z",
      actualQuantity: 80,
      actualUnit: "HOURS",
      remarks: "Uploaded via seed",
      uploadBatchRef: "ACT-2026-000001",
      enteredBy: "Priya PM",
      enteredDate: "2026-04-25T00:00:00.000Z"
    }
  ],
  milestones: [
    {
      id: "ms_1",
      number: "SOW-2026-000001-MS-01",
      sowId: "sow_1",
      name: "Design Sign-off",
      sequence: 1,
      plannedDate: "2026-05-10T00:00:00.000Z",
      plannedAmount: 40000,
      actualDate: null,
      actualAmount: null,
      invoiceDate: null,
      paymentDate: null,
      status: "Upcoming",
      remarks: ""
    }
  ],
  auditLogs: [
    {
      id: "aud_1",
      number: "AUD-2026-000001",
      entityName: "SOW",
      recordId: "sow_1",
      actionType: "CREATE",
      actor: "System Seed",
      sourceScreen: "Seed Script",
      createdAt: "2026-04-23T09:00:00.000Z"
    }
  ]
};
