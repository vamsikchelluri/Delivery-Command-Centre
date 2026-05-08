import { getCollection } from "../data/store.js";
import { prisma } from "../prisma.js";

export function permissionsForRole(roleName) {
  const permissions = getCollection("rolePermissions");
  return permissions
    .filter((permission) => permission.roleName === roleName && permission.allowed)
    .map((permission) => `${permission.featureKey}:${permission.action}`);
}

export function hydrateUserPermissions(user) {
  const permissions = permissionsForRole(user.role);
  return {
    ...user,
    permissions,
    canViewCost: user.canViewCost || permissions.includes("resourceCosting:view"),
    canViewMargin: user.canViewMargin || permissions.includes("sowFinancials:viewMargin")
  };
}

export async function permissionsForRoleFromDb(roleName) {
  if (!roleName) return [];
  const permissions = await prisma.rolePermission.findMany({
    where: {
      roleName,
      allowed: true
    },
    select: {
      featureKey: true,
      action: true
    }
  });
  return permissions.map((permission) => `${permission.featureKey}:${permission.action}`);
}

export async function hydrateUserPermissionsFromDb(user) {
  const permissions = await permissionsForRoleFromDb(user.role);
  return {
    ...user,
    permissions,
    canViewCost: user.canViewCost || permissions.includes("resourceCosting:view"),
    canViewMargin: user.canViewMargin || permissions.includes("sowFinancials:viewMargin")
  };
}

export function can(user, featureKey, action) {
  const permissions = user?.permissions || permissionsForRole(user?.role);
  return permissions.includes(`${featureKey}:${action}`);
}
