import { Router } from "express";
import { z } from "zod";
import { createAccessToken, verifyPassword } from "../lib/auth.js";
import { requireAuth } from "../middleware/auth.js";
import { getCollection } from "../data/store.js";

const router = Router();

router.post("/login", async (req, res) => {
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

  const token = createAccessToken(user);

  return res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      canViewCost: user.canViewCost,
      canViewMargin: user.canViewMargin
    }
  });
});

router.get("/me", requireAuth, async (req, res) => {
  const user = getCollection("users").find((item) => item.id === req.user.sub);

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  return res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    canViewCost: user.canViewCost,
    canViewMargin: user.canViewMargin
  });
});

export default router;
