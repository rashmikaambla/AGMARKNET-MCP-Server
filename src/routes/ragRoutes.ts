import { Router } from "express";
import { searchRag } from "../controllers/ragController.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();
router.get("/rag/search", asyncHandler(searchRag));

export default router;
