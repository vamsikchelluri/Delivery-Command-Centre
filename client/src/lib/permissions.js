export function currentUser() {
  try {
    return JSON.parse(localStorage.getItem("dcc-user") || "{}");
  } catch {
    return {};
  }
}

export function can(user, featureKey, action) {
  return (user?.permissions || []).includes(`${featureKey}:${action}`);
}

export function canViewResourceCost(user = currentUser()) {
  return can(user, "resourceCosting", "view") || Boolean(user?.canViewCost);
}

export function canEditResourceCost(user = currentUser()) {
  return can(user, "resourceCosting", "edit");
}
