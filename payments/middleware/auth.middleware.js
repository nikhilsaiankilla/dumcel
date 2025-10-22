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

        const token = authHeader.split(" ")[1]?.trim();
        if (!token) {
            return res.status(401).json({
                success: false,
                error: "Authorization token missing or malformed",
            });
        }

        const secrets = global.secrets;

        if (!secrets.jwt_secret) throw new Error('Secrets are missing')

        const secret = secrets.jwt_secret || "secret";
        const decoded = jwt.verify(token, secret);

        req.user = decoded;
        next();
    } catch (err) {
        console.error("JWT verification failed:", err instanceof Error ? err.message : err);
        return res.status(401).json({
            success: false,
            error: "Invalid or expired token",
        });
    }
};