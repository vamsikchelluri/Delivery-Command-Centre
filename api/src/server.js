import express from "express";
import cors from "cors";
import morgan from "morgan";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { config } from "./config.js";
import authRoutes from "./routes/auth.js";
import accountRoutes from "./routes/accounts.js";
import resourceRoutes from "./routes/resources.js";
import opportunityRoutes from "./routes/opportunities.js";
import sowRoutes from "./routes/sows.js";
import dashboardRoutes from "./routes/dashboard.js";
import resourcePlanningRoutes from "./routes/resourcePlanning.js";
import financialRoutes from "./routes/financials.js";
import actualRoutes from "./routes/actuals.js";
import adminRoutes from "./routes/admin.js";
import childRoutes from "./routes/children.js";
import { requireAuth } from "./middleware/auth.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const clientDistPath = path.resolve(__dirname, "../../client/dist");

const apiCors = cors({
  origin(origin, callback) {
    if (!origin || config.allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error("Not allowed by CORS"));
  }
});

app.use("/api", apiCors);
app.use(express.json());
app.use(morgan("dev"));

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/dashboard", requireAuth, dashboardRoutes);
app.use("/api/resource-planning", requireAuth, resourcePlanningRoutes);
app.use("/api/financials", requireAuth, financialRoutes);
app.use("/api/accounts", requireAuth, accountRoutes);
app.use("/api/resources", requireAuth, resourceRoutes);
app.use("/api/opportunities", requireAuth, opportunityRoutes);
app.use("/api/sows", requireAuth, sowRoutes);
app.use("/api/actuals", requireAuth, actualRoutes);
app.use("/api/admin", requireAuth, adminRoutes);
app.use("/api/children", requireAuth, childRoutes);

if (fs.existsSync(clientDistPath)) {
  app.use(express.static(clientDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api/")) {
      return next();
    }

    return res.sendFile(path.join(clientDistPath, "index.html"));
  });
}

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({
    message: "Server error",
    detail: error?.code || error?.message || "Unexpected failure"
  });
});

app.listen(config.port, () => {
  console.log(`API running on http://localhost:${config.port}`);
});
