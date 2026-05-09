import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { sapModuleCatalog } from "../src/data/sapModuleCatalog.js";

dotenv.config();

const prisma = new PrismaClient();

function subModuleCode(value, parentCode) {
  const raw = String(value || "").trim();
  if (/^[A-Z0-9/-]{2,14}$/i.test(raw)) {
    return raw.toUpperCase();
  }
  const initials = raw
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 8)
    .toUpperCase();
  return parentCode ? `${parentCode}-${initials || "SUB"}` : initials || "SUB";
}

function normalizeSubModules(skill) {
  return [...new Set(skill.subModules || [])].map((name, index) => ({
    id: `${skill.id}-${index + 1}`,
    code: subModuleCode(name, skill.code),
    value: name,
    name,
    description: "",
    sortOrder: index + 1,
    active: true
  }));
}

async function upsertSkill(skill) {
  const existing = await prisma.skill.findFirst({
    where: {
      OR: [
        { id: skill.id },
        { number: skill.number },
        { name: skill.name }
      ]
    }
  });

  const data = {
    id: existing?.id || skill.id,
    number: existing?.number || skill.number,
    code: skill.code,
    name: skill.name,
    description: skill.description || "",
    sortOrder: skill.sortOrder,
    subModules: normalizeSubModules(skill),
    active: skill.active !== false
  };

  if (existing) {
    return prisma.skill.update({
      where: { id: existing.id },
      data
    });
  }

  return prisma.skill.create({ data });
}

async function main() {
  for (const skill of sapModuleCatalog) {
    await upsertSkill(skill);
  }
  console.log(`Upserted ${sapModuleCatalog.length} SAP module master records.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
