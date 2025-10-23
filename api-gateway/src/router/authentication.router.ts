import express from "express";
import {
    changePassword,
    deleteAccountController,
    forgetPassword,
    getUserController,
    githubLoginController,
    loginController,
    logoutController,
    resetPassword,
    signupController,
    verifyOtp
} from "../controller/authentication.controller";
import { authMiddleware } from "../middleware/auth.middleware";

const router = express.Router();

// Signup
router.post("/signup", signupController);

// GitHub OAuth connect
router.get("/github/login", (req, res) => {

    if (
        // Check if GITHUB_CLIENT_ID is missing from BOTH process.env AND global.secrets
        !(process.env.GITHUB_CLIENT_ID || global.secrets?.github_client_id) ||

        // Check if GITHUB_CLIENT_SECRET is missing from BOTH process.env AND global.secrets
        !(process.env.GITHUB_CLIENT_SECRET || global.secrets?.github_client_secret)
    ) {
        throw new Error("Auth Secrets are missing from both environment variables and global.secrets.");
    }

    const redirectUri = "http://localhost:3000/connecting";
    const clientId = process.env.GITHUB_CLIENT_ID || global?.secrets?.github_client_id;
    const scope = "repo,user:email"; // ask for repo access

    const githubAuthUrl = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=${scope}`;

    res.send({ redirectUri: githubAuthUrl });
});

// GitHub OAuth callback
router.get("/github/callback", githubLoginController);

// Authentication routes
router.post("/login", loginController);
router.post("/forget-password", forgetPassword);
router.post("/verify-otp", verifyOtp);
router.post("/reset-password", resetPassword);
router.post('/logout', logoutController)

// Account management (protected routes)
router.delete("/delete/account", authMiddleware, deleteAccountController);
router.post("/change-password", authMiddleware, changePassword);

// get user
router.get('/get-user', authMiddleware, getUserController)

export const authenticationRouter = router;
