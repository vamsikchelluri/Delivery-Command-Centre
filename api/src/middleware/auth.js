import jwt from "jsonwebtoken";
import { config } from "../config.js";
import { can } from "../lib/permissions.js";

export function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const token = header.replace("Bearer ", "");

  try {
    req.user = jwt.verify(token, config.jwtSecret);
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function actionForMethod(method) {
  if (method === "GET") return "view";
  if (method === "POST") return "create";
  if (["PATCH", "PUT"].includes(method)) return "edit";
  if (method === "DELETE") return "delete";
  return "view";
}

export function requirePermission(featureKey, action) {
  return (req, res, next) => {
    const resolvedAction = action || actionForMethod(req.method);
    if (can(req.user, featureKey, resolvedAction)) {
      return next();
    }

    return res.status(403).json({ message: "Access denied for this feature." });
  };
}

export function requirePlatformAdmin(req, res, next) {
  if (can(req.user, "admin", "view") || can(req.user, "masterData", "view")) {
    return next();
  }

  return res.status(403).json({ message: "Admin access is not enabled for this role." });
}

export function requireChildCollectionPermission(req, res, next) {
  const collection = req.params.collection || req.path.split("/").filter(Boolean)[0];
  const featureByCollection = {
    opportunityRoles: "opportunities",
    sowRoles: "sows",
    deployments: "sows",
    deploymentPlans: "sows",
    milestones: "sows",
    sowAttachments: "attachments",
    actuals: "actuals"
  };
  const featureKey = featureByCollection[collection];

  if (!featureKey) {
    return res.status(404).json({ message: "Unknown child collection" });
  }

  return requirePermission(featureKey)(req, res, next);
}
