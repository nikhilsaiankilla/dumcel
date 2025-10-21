import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { CreditTransactionModel } from "../model/creditTransaction.model";
import { CreditPurchaseModel } from "../model/payment.model";

export const getAllCreditUsage = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new Error("Unauthenticated User");

        // Pagination
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        // Fetch transactions & total count
        const [transactions, totalCount] = await Promise.all([
            CreditTransactionModel.find({ userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            CreditTransactionModel.countDocuments({ userId }),
        ]);
        return res.json({
            status: "success",
            data: {
                transactions,
                pagination: {
                    total: totalCount,
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount / limit),
                    hasNextPage: page * limit < totalCount,
                    hasPrevPage: page > 1,
                },
            },
        });
    } catch (error: unknown) {
        return res.status(400).json({
            status: "failed",
            error: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
}

export const getAllPayments = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new Error("Unauthenticated User");

        // Pagination
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        // Fetch payments & total count
        const [payments, totalCount] = await Promise.all([
            CreditPurchaseModel.find({ userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            CreditPurchaseModel.countDocuments({ userId }),
        ]);

        return res.json({
            status: "success",
            data: {
                payments,
                pagination: {
                    total: totalCount,
                    page,
                    limit,
                    totalPages: Math.ceil(totalCount / limit),
                    hasNextPage: page * limit < totalCount,
                    hasPrevPage: page > 1,
                },
            },
        });
    } catch (error: unknown) {
        return res.status(400).json({
            status: "failed",
            error: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
}