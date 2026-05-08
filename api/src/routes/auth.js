import { Router } from "express";
import { z } from "zod";
import { createAccessToken, verifyPassword } from "../lib/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { hydrateUserPermissionsFromDb } from "../lib/permissions.js";
import { getCollection } from "../data/store.js";

const router = Router();

function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
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

  const authorizedUser = await hydrateUserPermissionsFromDb(user);
  const token = createAccessToken(authorizedUser);

  return res.json({
    token,
    user: {
      id: authorizedUser.id,
      name: authorizedUser.name,
      email: authorizedUser.email,
      role: authorizedUser.role,
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

  const authorizedUser = await hydrateUserPermissionsFromDb(user);

  return res.json({
    id: authorizedUser.id,
    name: authorizedUser.name,
    email: authorizedUser.email,
    role: authorizedUser.role,
    canViewCost: authorizedUser.canViewCost,
    canViewMargin: authorizedUser.canViewMargin,
    permissions: authorizedUser.permissions
  });
}));

export default router;
