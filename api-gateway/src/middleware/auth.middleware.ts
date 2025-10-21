import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface JwtPayload {
    id: string;
    email: string;
    userId: string
    role?: string;
}

export interface AuthenticatedRequest extends Request {
    user?: JwtPayload;
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                error: "Authorization token missing or invalid",
            });
        }

        const token = authHeader.split(" ")[1]?.trim();

        if (!token) {
            return res.status(401).json({
                success: false,
                error: "Authorization token missing or malformed",
            });
        }

        const secret = process.env.JWT_SECRET || "secret";

        const decoded = jwt.verify(token, secret) as JwtPayload;

        req.user = decoded;

        next();
    } catch (err: any) {
        console.error("JWT verification failed:", err.message);
        return res.status(401).json({
            success: false,
            error: "Invalid or expired token",
        });
    }
};

