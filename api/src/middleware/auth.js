import jwt from "jsonwebtoken";
import { config } from "../config.js";

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
