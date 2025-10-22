import { Response } from "express";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { TokenModel } from "../model/tokens.model";
import jwt from 'jsonwebtoken'
import { UserModel } from "../model/user.model";

export const githubRepoConnectController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const secrets = global.secrets;
        if (!secrets?.github_client_id || !secrets?.github_client_secret) {
            throw new Error("GitHub OAuth secrets missing");
        }

        const { code, state } = req.query;
        if (!code) throw new Error("Missing authorization code");
        if (!state) throw new Error("Missing state");

        // Decode JWT user from state
        let userId: string;
        try {
            const decoded: any = jwt.verify(state as string, process.env.JWT_SECRET || "secret");
            userId = decoded.userId;
            if (!userId) throw new Error("Invalid state payload");
        } catch {
            throw new Error("Invalid state token");
        }

        // Exchange code → access token with repo scope
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify({
                client_id: secrets.github_client_id,
                client_secret: secrets.github_client_secret,
                code,
                scope: "public_repo",
            }),
        });

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) throw new Error("GitHub token exchange failed");

        // Save or update token
        await TokenModel.findOneAndUpdate(
            { user: userId, provider: "github" },
            { accessToken },
            { upsert: true, new: true }
        );

        await UserModel.findByIdAndUpdate(userId, { isGitConnected: true }, { new: true });

        // Success response
        res.status(200).json({
            success: true,
            message: "GitHub repository connected successfully",
        });

    } catch (err: unknown) {
        console.error("GitHub repo connect error:", err);
        res.status(500).json({
            success: false,
            error: err instanceof Error ? err.message : "Internal Server Error",
        });
    }
};

export const githubGetReposController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new Error("Unauthorized user");

        const tokenDoc = await TokenModel.findOne({ user: userId, provider: "github" });
        if (!tokenDoc?.accessToken) throw new Error("GitHub not connected");

        // Fetch repositories
        const reposRes = await fetch("https://api.github.com/user/repos?visibility=public", {
            headers: { Authorization: `Bearer ${tokenDoc.accessToken}` },
        });

        if (!reposRes.ok) {
            throw new Error(`GitHub API request failed with status ${reposRes.status}`);
        }

        const repos = await reposRes.json();

        // Success response
        res.status(200).json({
            success: true,
            data: repos,
        });

    } catch (err: unknown) {
        console.error("GitHub repo fetch error:", err);
        res.status(500).json({
            success: false,
            error: err instanceof Error ? err.message : "Internal Server Error",
        });
    }
};
