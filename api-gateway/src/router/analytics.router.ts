import express from "express";
import { getAnalyticsController } from "../controller/analytics.controller";

const router = express.Router();

router.get('/:projectId', getAnalyticsController)

export const analyticsRouter = router;