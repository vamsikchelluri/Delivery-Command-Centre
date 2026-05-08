export function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("dcc-user") || "{}");
  } catch {
    return {};
  }
}

export function can(user, featureKey, action) {
  const permissions = user?.permissions || [];
  return permissions.includes("*") || permissions.includes(`${featureKey}:*`) || permissions.includes(`${featureKey}:${action}`);
}

export function isPlatformAdmin(user = currentUser()) {
  return ["COO", "Super Admin"].includes(user?.role);
}

export function canViewResourceCost(user = currentUser()) {
  return can(user, "resourceCosting", "view") || Boolean(user?.canViewCost);
}

export function canEditResourceCost(user = currentUser()) {
  return can(user, "resourceCosting", "edit");
}
