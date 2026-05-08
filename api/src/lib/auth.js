import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { config } from "../config.js";

export function createAccessToken(user) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      canViewCost: user.canViewCost,
      canViewMargin: user.canViewMargin,
      permissions: user.permissions || []
    },
    config.jwtSecret,
    { expiresIn: "8h" }
  );
}

export async function verifyPassword(password, passwordHash) {
  return bcrypt.compare(password, passwordHash);
}

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}
