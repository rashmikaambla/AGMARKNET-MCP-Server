import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { connectToDatabase } from "../services/mongodb.js";
import { requestLogger } from "../middleware/requestLogger.js";
import { errorHandler } from "../middleware/errorHandler.js";
import healthRoutes from "../routes/healthRoutes.js";
import marketRoutes from "../routes/marketRoutes.js";
import ragRoutes from "../routes/ragRoutes.js";
import ingestionRoutes from "../routes/ingestionRoutes.js";
import { logger } from "../utils/logger.js";
import { startDailySyncJob } from "../jobs/dailySyncJob.js";

export async function createApp() {
  await connectToDatabase();

  const app = express();
  app.use(helmet());
  app.use(cors());
  app.use(express.json());
  app.use(requestLogger);

  app.use("/api", healthRoutes);
  app.use("/api", marketRoutes);
  app.use("/api", ragRoutes);
  app.use("/api", ingestionRoutes);

  app.use(errorHandler);

  return app;
}

export async function startRestServer() {
  const app = await createApp();
  const port = Number(process.env.PORT || 3000);

  app.listen(port, () => {
    logger.info(`REST API server listening`, { port });
  });

  // Production recommendation: Windows Task Scheduler runs `npm run sync`
  // at 21:00. Keep the in-process scheduler disabled to avoid duplicate runs.
  if (process.env.ENABLE_INTERNAL_SCHEDULER === "true") {
    startDailySyncJob();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  startRestServer().catch((err) => {
    logger.error("Fatal error starting REST server", { error: (err as Error).message });
    process.exit(1);
  });
}
