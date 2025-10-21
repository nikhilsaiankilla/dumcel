import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { getAllCreditUsage, getAllPayments } from "../controller/credits.controller";

const router = express.Router();

router.get('/', authMiddleware, getAllCreditUsage)

router.get('/get-payments', authMiddleware, getAllPayments)

export const creditsRouter = router;