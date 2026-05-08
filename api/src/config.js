import dotenv from "dotenv";

dotenv.config();

const allowedOrigins = (process.env.CLIENT_URL || "http://localhost:5173")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "change-me",
  clientUrl: process.env.CLIENT_URL || "http://localhost:5173",
  allowedOrigins
};
