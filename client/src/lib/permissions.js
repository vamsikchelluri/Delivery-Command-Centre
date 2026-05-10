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
  return can(user, "admin", "view") || can(user, "masterData", "view");
}

export function canViewResourceCost(user = currentUser()) {
  return can(user, "resourceCosting", "view") || Boolean(user?.canViewCost);
}

export function canEditResourceCost(user = currentUser()) {
  return can(user, "resourceCosting", "edit");
}
