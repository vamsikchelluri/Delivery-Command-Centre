import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { DEFAULT_OVERHEAD_RULES, OVERHEAD_RULES_CONFIG_KEY } from "../src/lib/overheadDefaults.js";

const prisma = new PrismaClient();

try {
  await prisma.systemConfig.upsert({
    where: { key: OVERHEAD_RULES_CONFIG_KEY },
    update: {
      value: JSON.stringify(DEFAULT_OVERHEAD_RULES),
      description: "Engagement type and location type overhead rules"
    },
    create: {
      id: "cfg_engagement_overhead_rules",
      key: OVERHEAD_RULES_CONFIG_KEY,
      value: JSON.stringify(DEFAULT_OVERHEAD_RULES),
      description: "Engagement type and location type overhead rules"
    }
  });
  console.log(`Upserted ${DEFAULT_OVERHEAD_RULES.length} engagement overhead rules.`);
} finally {
  await prisma.$disconnect();
}
