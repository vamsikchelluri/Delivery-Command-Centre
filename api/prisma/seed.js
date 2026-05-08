import bcrypt from "bcryptjs";
import { PrismaClient, OpportunityStage, SowStatus, BillingModel, EmploymentStatus, DeliveryStatus, DeploymentStatus, MeasurementUnit } from "@prisma/client";

const prisma = new PrismaClient();

function asDate(value) {
  return new Date(value);
}

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.actual.deleteMany();
  await prisma.deployment.deleteMany();
  await prisma.milestone.deleteMany();
  await prisma.sowRole.deleteMany();
  await prisma.sow.deleteMany();
  await prisma.opportunityRole.deleteMany();
  await prisma.opportunity.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.user.deleteMany();
  await prisma.account.deleteMany();

  const passwordHash = await bcrypt.hash("admin123", 10);

  await prisma.user.createMany({
    data: [
      {
        number: "USR-2026-000001",
        name: "Aarav COO",
        email: "coo@dcc.local",
        passwordHash,
        role: "COO",
        canViewCost: true,
        canViewMargin: true
      },
      {
        number: "USR-2026-000002",
        name: "Divya Delivery",
        email: "dm@dcc.local",
        passwordHash,
        role: "Delivery Manager",
        canViewCost: true,
        canViewMargin: true
      },
      {
        number: "USR-2026-000003",
        name: "Rohan Account",
        email: "am@dcc.local",
        passwordHash,
        role: "Account Manager",
        canViewCost: true,
        canViewMargin: false
      }
    ]
  });

  const accounts = await Promise.all([
    prisma.account.create({
      data: {
        number: "ACC-2026-000001",
        name: "Acme Industries",
        industry: "Manufacturing",
        region: "North America"
      }
    }),
    prisma.account.create({
      data: {
        number: "ACC-2026-000002",
        name: "Globex Retail",
        industry: "Retail",
        region: "Europe"
      }
    })
  ]);

  const resources = await Promise.all([
    prisma.resource.create({
      data: {
        number: "RES-2026-000001",
        firstName: "Meera",
        lastName: "Krishnan",
        email: "meera@dcc.local",
        primarySkill: "SAP FICO",
        subModule: "GL, AP, AR",
        location: "Hyderabad",
        locationType: "Offshore",
        employmentType: "Full-Time",
        employmentStatus: EmploymentStatus.ACTIVE,
        deliveryStatus: DeliveryStatus.FULLY_DEPLOYED,
        deployedPercent: 100,
        costRate: 42,
        ownerName: "Divya Delivery",
        currentSowName: "Acme S/4 Finance Rollout"
      }
    }),
    prisma.resource.create({
      data: {
        number: "RES-2026-000002",
        firstName: "Kiran",
        lastName: "Patel",
        email: "kiran@dcc.local",
        primarySkill: "SAP SD",
        subModule: "Order to Cash",
        location: "Bengaluru",
        locationType: "Offshore",
        employmentType: "Contractor",
        employmentStatus: EmploymentStatus.ACTIVE,
        deliveryStatus: DeliveryStatus.PARTIALLY_DEPLOYED,
        deployedPercent: 50,
        costRate: 36,
        ownerName: "Divya Delivery",
        availabilityDate: asDate("2026-05-01")
      }
    }),
    prisma.resource.create({
      data: {
        number: "RES-2026-000003",
        firstName: "Ananya",
        lastName: "Rao",
        email: "ananya@dcc.local",
        primarySkill: "SAP Basis",
        subModule: "S/4 Upgrade",
        location: "Pune",
        locationType: "Offshore",
        employmentType: "Full-Time",
        employmentStatus: EmploymentStatus.ACTIVE,
        deliveryStatus: DeliveryStatus.AVAILABLE,
        deployedPercent: 0,
        costRate: 31,
        ownerName: "Divya Delivery",
        availabilityDate: asDate("2026-04-23")
      }
    })
  ]);

  const opportunity1 = await prisma.opportunity.create({
    data: {
      number: "OPP-2026-000001",
      accountId: accounts[0].id,
      name: "Acme Finance Transformation Wave 2",
      stage: OpportunityStage.NEGOTIATING,
      probability: 70,
      estimatedRevenue: 185000,
      roleEstimatedRevenue: 165000,
      weightedValue: 129500,
      currency: "USD",
      expectedCloseDate: asDate("2026-05-15"),
      expectedStartDate: asDate("2026-06-01"),
      expectedEndDate: asDate("2026-10-31"),
      accountManagerName: "Rohan Account",
      deliveryManagerName: "Divya Delivery",
      dealType: "Expansion",
      notes: "Strong buying intent. Commercials under review."
    }
  });

  await prisma.opportunityRole.createMany({
    data: [
      {
        number: "OPP-2026-000001-01",
        opportunityId: opportunity1.id,
        title: "SAP FICO Lead",
        skill: "SAP FICO",
        subModule: "GL, AP, AR",
        quantity: 1,
        engagementType: "Full-Time",
        experienceLevel: "Lead",
        startDate: asDate("2026-06-01"),
        duration: 4,
        endDate: asDate("2026-09-30"),
        estimatedHours: 640,
        billRate: 115,
        costGuidance: 55,
        allocationPercent: 100,
        resourceIdentificationStatus: "Identified",
        candidateResourceName: "Meera Krishnan"
      },
      {
        number: "OPP-2026-000001-02",
        opportunityId: opportunity1.id,
        title: "SAP SD Consultant",
        skill: "SAP SD",
        subModule: "Order to Cash",
        quantity: 1,
        engagementType: "Part-Time",
        experienceLevel: "Consultant",
        startDate: asDate("2026-06-15"),
        duration: 3,
        endDate: asDate("2026-09-15"),
        estimatedHours: 240,
        billRate: 95,
        costGuidance: 44,
        allocationPercent: 50,
        resourceIdentificationStatus: "Identified",
        candidateResourceName: "Kiran Patel"
      }
    ]
  });

  const sow1 = await prisma.sow.create({
    data: {
      number: "SOW-2026-000001",
      accountId: accounts[0].id,
      name: "Acme S/4 Finance Rollout",
      billingModel: BillingModel.TM_HOURLY,
      status: SowStatus.ACTIVE,
      currency: "USD",
      startDate: asDate("2026-04-01"),
      endDate: asDate("2026-07-31"),
      contractValue: 250000,
      visibleRevenue: 98250,
      visibleCost: 42100,
      grossMargin: 56150,
      grossMarginPercent: 57.15,
      projectHealth: "Green",
      projectManagerName: "Priya PM",
      deliveryManagerName: "Divya Delivery",
      accountManagerName: "Rohan Account",
      createdFrom: "DIRECT"
    }
  });

  const sowRole1 = await prisma.sowRole.create({
    data: {
      number: "SOW-2026-000001-01",
      sowId: sow1.id,
      title: "SAP FICO Lead",
      skill: "SAP FICO",
      subModule: "GL, AP, AR",
      quantity: 1,
      engagementType: "Full-Time",
      billingType: "Hourly",
      billRate: 115,
      costRate: 42,
      startDate: asDate("2026-04-01"),
      duration: 4,
      endDate: asDate("2026-07-31"),
      plannedAllocationPercent: 100,
      plannedHours: 640,
      staffingPriority: "High",
      staffingStatus: "Fully Staffed",
      measurementUnit: MeasurementUnit.HOURS
    }
  });

  const sowRole2 = await prisma.sowRole.create({
    data: {
      number: "SOW-2026-000001-02",
      sowId: sow1.id,
      title: "SAP SD Consultant",
      skill: "SAP SD",
      subModule: "Order to Cash",
      quantity: 1,
      engagementType: "Part-Time",
      billingType: "Hourly",
      billRate: 95,
      costRate: 36,
      startDate: asDate("2026-04-01"),
      duration: 4,
      endDate: asDate("2026-07-31"),
      plannedAllocationPercent: 50,
      plannedHours: 320,
      staffingPriority: "Medium",
      staffingStatus: "Partially Staffed",
      measurementUnit: MeasurementUnit.HOURS
    }
  });

  const deployment1 = await prisma.deployment.create({
    data: {
      number: "DPL-2026-000001",
      sowRoleId: sowRole1.id,
      resourceId: resources[0].id,
      startDate: asDate("2026-04-01"),
      endDate: asDate("2026-07-31"),
      allocationPercent: 100,
      status: DeploymentStatus.ACTIVE,
      lockedCostRate: 42,
      lockedBillRate: 115,
      sourceOfAssignment: "Direct Staffing"
    }
  });

  const deployment2 = await prisma.deployment.create({
    data: {
      number: "DPL-2026-000002",
      sowRoleId: sowRole2.id,
      resourceId: resources[1].id,
      startDate: asDate("2026-04-01"),
      endDate: asDate("2026-07-31"),
      allocationPercent: 50,
      status: DeploymentStatus.ACTIVE,
      lockedCostRate: 36,
      lockedBillRate: 95,
      sourceOfAssignment: "Direct Staffing"
    }
  });

  await prisma.actual.createMany({
    data: [
      {
        number: "ACT-2026-000001",
        deploymentId: deployment1.id,
        month: asDate("2026-04-01"),
        actualQuantity: 160,
        actualUnit: MeasurementUnit.HOURS,
        remarks: "Uploaded via seed",
        uploadBatchRef: "ACT-2026-000001",
        enteredBy: "Priya PM"
      },
      {
        number: "ACT-2026-000002",
        deploymentId: deployment2.id,
        month: asDate("2026-04-01"),
        actualQuantity: 80,
        actualUnit: MeasurementUnit.HOURS,
        remarks: "Uploaded via seed",
        uploadBatchRef: "ACT-2026-000001",
        enteredBy: "Priya PM"
      }
    ]
  });

  await prisma.milestone.create({
    data: {
      number: "SOW-2026-000001-MS-01",
      sowId: sow1.id,
      name: "Design Sign-off",
      sequence: 1,
      plannedDate: asDate("2026-05-10"),
      plannedAmount: 40000,
      status: "Upcoming"
    }
  });

  await prisma.auditLog.createMany({
    data: [
      {
        number: "AUD-2026-000001",
        entityName: "SOW",
        recordId: sow1.id,
        actionType: "CREATE",
        actor: "System Seed",
        sourceScreen: "Seed Script"
      },
      {
        number: "AUD-2026-000002",
        entityName: "Opportunity",
        recordId: opportunity1.id,
        actionType: "CREATE",
        actor: "System Seed",
        sourceScreen: "Seed Script"
      }
    ]
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
