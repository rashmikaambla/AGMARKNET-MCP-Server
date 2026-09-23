import { Router } from "express";
import { runManualIngestion, runBackfill } from "../controllers/ingestionController.js";
import { adminAuth } from "../middleware/adminAuth.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();
router.post("/ingestion/run", adminAuth, asyncHandler(runManualIngestion));
router.post("/ingestion/backfill", adminAuth, asyncHandler(runBackfill));

export default router;
