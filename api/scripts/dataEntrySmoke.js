const baseUrl = "http://localhost:4000/api";

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(globalThis.token ? { Authorization: `Bearer ${globalThis.token}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`${options.method || "GET"} ${path} failed: ${response.status} ${body}`);
  }

  return response.json();
}

async function post(path, body) {
  return request(path, { method: "POST", body: JSON.stringify(body) });
}

async function main() {
  const login = await post("/auth/login", { email: "coo@dcc.local", password: "admin123" });
  globalThis.token = login.token;

  const account = await post("/accounts", {
    name: "Smoke Test Manufacturing",
    industry: "Manufacturing",
    region: "North America"
  });

  const resource = await post("/resources", {
    firstName: "Smoke",
    lastName: "Consultant",
    primarySkill: "SAP FICO",
    subModule: "GL",
    location: "Hyderabad",
    locationType: "Offshore",
    employmentType: "Full-Time",
    employmentStatus: "ACTIVE",
    deliveryStatus: "AVAILABLE",
    deployedPercent: 0,
    costRate: 40,
    ownerName: "Divya Delivery"
  });

  const opportunity = await post("/opportunities", {
    accountId: account.id,
    name: "Smoke Test Finance Opportunity",
    stage: "QUALIFYING",
    probability: 20,
    estimatedRevenue: 100000,
    currency: "USD",
    expectedCloseDate: "2026-06-01",
    expectedStartDate: "2026-07-01",
    accountManagerName: "Rohan Account",
    deliveryManagerName: "Divya Delivery",
    dealType: "New"
  });

  await post("/children/opportunityRoles", {
    opportunityId: opportunity.id,
    title: "SAP FICO Consultant",
    skill: "SAP FICO",
    subModule: "GL",
    quantity: 1,
    engagementType: "Full-Time",
    experienceLevel: "Consultant",
    estimatedHours: 160,
    billRate: 100,
    costGuidance: 50,
    allocationPercent: 100,
    resourceIdentificationStatus: "Identified",
    candidateResourceName: `${resource.firstName} ${resource.lastName}`
  });

  const sow = await post("/sows", {
    accountId: account.id,
    name: "Smoke Test SOW",
    billingModel: "TM_HOURLY",
    currency: "USD",
    startDate: "2026-07-01",
    endDate: "2026-09-30",
    contractValue: 100000,
    projectManagerName: "Priya PM",
    deliveryManagerName: "Divya Delivery",
    accountManagerName: "Rohan Account",
    projectHealth: "Green"
  });

  const role = await post("/children/sowRoles", {
    sowId: sow.id,
    title: "SAP FICO Consultant",
    skill: "SAP FICO",
    subModule: "GL",
    quantity: 1,
    engagementType: "Full-Time",
    billingType: "Hourly",
    billRate: 100,
    costRate: 40,
    plannedAllocationPercent: 100,
    plannedHours: 160,
    staffingStatus: "Open",
    measurementUnit: "HOURS"
  });

  const deployment = await post("/children/deployments", {
    sowRoleId: role.id,
    resourceId: resource.id,
    startDate: "2026-07-01",
    endDate: "2026-09-30",
    allocationPercent: 100,
    status: "ACTIVE",
    lockedCostRate: 40,
    lockedBillRate: 100,
    billable: true,
    sourceOfAssignment: "Smoke Test"
  });

  await post("/children/actuals", {
    deploymentId: deployment.id,
    month: "2026-07-01",
    actualQuantity: 160,
    actualUnit: "HOURS",
    remarks: "Smoke test manual actual",
    enteredBy: "Priya PM"
  });

  await post("/children/milestones", {
    sowId: sow.id,
    name: "Smoke Milestone",
    sequence: 1,
    plannedDate: "2026-08-15",
    plannedAmount: 25000,
    status: "Upcoming",
    remarks: "Smoke test milestone"
  });

  const dashboard = await request("/dashboard");

  console.log(JSON.stringify({
    ok: true,
    created: {
      account: account.number,
      resource: resource.number,
      opportunity: opportunity.number,
      sow: sow.number,
      sowRole: role.title,
      deployment: deployment.number
    },
    dashboard: dashboard.kpis
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
