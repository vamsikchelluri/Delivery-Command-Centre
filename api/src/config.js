import dotenv from "dotenv";

dotenv.config();

function toOrigin(value) {
  if (!value) return null;
  const raw = value.trim();
  if (!raw) return null;
  return raw.startsWith("http://") || raw.startsWith("https://") ? raw : `https://${raw}`;
}

const allowedOrigins = [
  ...(process.env.CLIENT_URL || "http://localhost:5173").split(","),
  process.env.RAILWAY_PUBLIC_DOMAIN,
  process.env.RAILWAY_STATIC_URL
]
  .map(toOrigin)
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ""))
  .filter((origin, index, origins) => origins.indexOf(origin) === index);

const clientUrl = allowedOrigins[0] || "http://localhost:5173";

export const config = {
  port: Number(process.env.PORT || 4000),
  jwtSecret: process.env.JWT_SECRET || "change-me",
  clientUrl,
  allowedOrigins
};
