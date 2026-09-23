import { Router } from "express";
import { health } from "../controllers/marketController.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();
router.get("/health", asyncHandler(async (req, res) => health(req, res)));

export default router;
