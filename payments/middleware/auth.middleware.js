import jwt from "jsonwebtoken";

export const authMiddleware = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                error: "Authorization token missing or invalid",
            });
        }

        const token = authHeader.split(" ")[1];
        const secret = process.env.JWT_SECRET || "secret";

        if (!secret) {
            throw new Error("JWT_SECRET not defined in environment");
        }

        // Verify token
        const decoded = jwt.verify(token, secret)

        // Attach decoded payload to request
        req.user = decoded;

        next();
    } catch (err) {
        return res.status(401).json({
            success: false,
            error: "Invalid or expired token",
        });
    }
};
