import { Router } from "express";
import { z } from "zod";
import { createAccessToken, hashPassword, verifyPassword } from "../lib/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { hydrateUserPermissions, hydrateUserPermissionsFromDb } from "../lib/permissions.js";
import { getCollection, updateRecord } from "../data/store.js";

const router = Router();

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

async function hydrateUserPermissionsForLogin(user) {
  try {
    return await hydrateUserPermissionsFromDb(user);
  } catch (error) {
    console.error("Unable to load Postgres permissions; using local fallback permissions.", error);
    return hydrateUserPermissions(user);
  }
}

router.post("/login", asyncRoute(async (req, res) => {
  const schema = z.object({
    email: z.string().email(),
    password: z.string().min(3)
  });

  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid login payload" });
  }

  const user = getCollection("users").find((item) => item.email === parsed.data.email);

  if (!user) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const valid = await verifyPassword(parsed.data.password, user.passwordHash);

  if (!valid) {
    return res.status(401).json({ message: "Invalid credentials" });
  }

  const authorizedUser = await hydrateUserPermissionsForLogin(user);
  const token = createAccessToken(authorizedUser);

  return res.json({
    token,
    user: {
      id: authorizedUser.id,
      name: authorizedUser.name,
      email: authorizedUser.email,
      role: authorizedUser.role,
      deliveryRoles: authorizedUser.deliveryRoles || [],
      canViewCost: authorizedUser.canViewCost,
      canViewMargin: authorizedUser.canViewMargin,
      permissions: authorizedUser.permissions
    }
  });
}));

router.get("/me", requireAuth, asyncRoute(async (req, res) => {
  const user = getCollection("users").find((item) => item.id === req.user.sub);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const authorizedUser = await hydrateUserPermissionsForLogin(user);

  return res.json({
    id: authorizedUser.id,
    name: authorizedUser.name,
    email: authorizedUser.email,
    role: authorizedUser.role,
    deliveryRoles: authorizedUser.deliveryRoles || [],
    canViewCost: authorizedUser.canViewCost,
    canViewMargin: authorizedUser.canViewMargin,
    permissions: authorizedUser.permissions
  });
}));

router.patch("/change-password", requireAuth, asyncRoute(async (req, res) => {
  const schema = z.object({
    currentPassword: z.string().min(3),
    newPassword: z.string().min(8)
  });
  const parsed = schema.safeParse(req.body);

  if (!parsed.success) {
    return res.status(400).json({ message: "Invalid password payload", issues: parsed.error.issues });
  }

  const user = getCollection("users").find((item) => item.id === req.user.sub);
  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  const valid = await verifyPassword(parsed.data.currentPassword, user.passwordHash);
  if (!valid) {
    return res.status(401).json({ message: "Current password is incorrect" });
  }

  updateRecord("users", user.id, {
    passwordHash: await hashPassword(parsed.data.newPassword),
    passwordChangedAt: new Date().toISOString()
  });

  return res.json({ ok: true });
}));

export default router;
