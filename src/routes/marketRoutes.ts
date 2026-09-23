import { Router } from "express";
import * as controller from "../controllers/marketController.js";
import { asyncHandler } from "../middleware/errorHandler.js";

const router = Router();

router.get("/market-data/daily", asyncHandler(controller.getDailyMarketData));
router.get("/market-data/district/:district", asyncHandler(controller.getDistrictMarketData));
router.get("/market-data/state", asyncHandler(controller.getStateMarketData));
router.get("/market-data/market/:market", asyncHandler(controller.getMarketData));
router.get("/market-data/commodity/:commodity", asyncHandler(controller.getCommodityPrice));
router.get("/market-data/trend/:commodity", asyncHandler(controller.getPriceTrend));
router.get("/markets", asyncHandler(controller.getMarkets));
router.get("/data-status", asyncHandler(controller.getDataStatus));

export default router;
