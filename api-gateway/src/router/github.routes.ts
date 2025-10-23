import express from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { githubGetReposController, githubRepoConnectController } from "../controller/github.controller";
import { githubLoginController } from "../controller/authentication.controller";
import jwt from "jsonwebtoken";

const router = express.Router();

router.get("/callback", async (req, res) => {
    const { state } = req.query;

    if (!state) return githubLoginController(req, res);

    if (!(process.env.JWT_SECRET || global?.secrets?.jwt_secret)) {
        throw new Error('JWT Secret is missing from both process.env and global.secrets');
    }

    try {
        // Verify JWT instead of parsing as JSON
        const decoded: any = jwt.verify(state as string, process.env.JWT_SECRET || global?.secrets?.jwt_secret || "secret");

        // If decoded has userId → repo connect
        if (decoded?.userId) return githubRepoConnectController(req, res);
    } catch (err) {
        console.log("Invalid state JWT", err);
    }

    // fallback → login flow
    return githubLoginController(req, res);
});

// fetch repos after connecting
router.get("/repos", authMiddleware, githubGetReposController);

export const githubRouter = router;
