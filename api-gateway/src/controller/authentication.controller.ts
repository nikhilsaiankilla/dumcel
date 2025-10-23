import { Request, Response } from "express";
import { z } from "zod";
import { UserModel } from "../model/user.model";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import { generateOTP } from "../utils/utils";
import { OtpModel } from "../model/otp.model";
import { TokenModel } from "../model/tokens.model";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { ProjectModel } from "../model/project.model";
import { DeploymentModel } from "../model/deployment.model";
import mongoose from "mongoose";
import { CreditTransactionModel } from "../model/creditTransaction.model";

export const githubLoginController = async (req: Request, res: Response) => {
    try {
        if (
            // Check if GITHUB_CLIENT_ID is missing from BOTH process.env AND global.secrets
            !(process.env.GITHUB_CLIENT_ID || global.secrets?.github_client_id) ||

            // Check if GITHUB_CLIENT_SECRET is missing from BOTH process.env AND global.secrets
            !(process.env.GITHUB_CLIENT_SECRET || global.secrets?.github_client_secret)
        ) {
            throw new Error("Auth Secrets are missing from both environment variables and global.secrets.");
        }

        const { code } = req.query;
        if (!code) throw new Error("Missing authorization code");

        // Exchange code → access token
        const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID || global?.secrets?.github_client_id,
                client_secret: process.env.GITHUB_CLIENT_SECRET || global?.secrets?.github_client_secret,
                code,
            }),
        });

        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
        if (!accessToken) throw new Error("GitHub token exchange failed");

        // Get GitHub user profile + email
        const [userRes, emailRes] = await Promise.all([
            fetch("https://api.github.com/user", {
                headers: { Authorization: `Bearer ${accessToken}`},
            }),
            fetch("https://api.github.com/user/emails", {
                headers: { Authorization: `Bearer ${accessToken}` },
            }),
        ]);

        const ghUser = await userRes.json();
        const ghEmails = await emailRes.json();
        const primaryEmail = ghEmails.find((e: any) => e.primary)?.email;

        // Use githubId or email to find user
        let user =
            (primaryEmail && (await UserModel.findOne({ email: primaryEmail }))) ||
            (await UserModel.findOne({ githubId: ghUser.id }));

        // If not found, create new user
        if (!user) {
            user = await UserModel.create({
                name: ghUser.name || ghUser.login,
                email: primaryEmail || `${ghUser.login}@github.nouser`,
                githubId: ghUser.id,
                photo: ghUser.avatar_url,
                credits: 10, // Welcome bonus
            });

            await CreditTransactionModel.create({
                userId: user._id,
                type: "credit",
                amount: 10,
                reason: "Welcome bonus for joining via GitHub",
                balanceAfter: user.credits,
            });
        } else {
            // Update missing GitHub fields if necessary
            if (!user.githubId) {
                user.githubId = ghUser.id;
                await user.save();
            }
        }
        
        // Issue JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET || global?.secrets?.jwt_secret || "secret",
            { expiresIn: "1h" }
        );

        // Set cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 3600 * 1000,
        });

        // Redirect to frontend with token
        const redirectUrl = `${process.env.FRONTEND_URL || global?.secrets?.frontend_url}/auth/github?token=${token}`;
        res.redirect(redirectUrl);

    } catch (err) {
        console.error("GitHub login error:", err);
        res.status(500).json({
            success: false,
            error: err instanceof Error ? err.message : "GitHub login failed",
        });
    }
};

export const signupController = async (req: Request, res: Response) => {
    try {
        const schema = z.object({
            name: z.string().min(3, "Name must be at least 3 characters"),
            email: z.string().email(),
            password: z
                .string()
                .min(6, "Password must be at least 6 characters long")
                .regex(/[A-Z]/, "Password must include at least one uppercase letter")
                .regex(/[a-z]/, "Password must include at least one lowercase letter")
                .regex(/[^A-Za-z0-9]/, "Password must include at least one special character")
        });

        // Validate input
        const { email, password, name } = schema.parse(req.body);

        // Check if user already exists
        const existingUser = await UserModel.findOne({ email });
        if (existingUser) throw new Error("User already exists");

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser = await UserModel.create({
            name,
            email,
            password: hashedPassword,
            credits: 10,
        });

        // Log the credit transaction
        await CreditTransactionModel.create({
            user: newUser._id,
            type: "credit",
            amount: 10,
            reason: "Welcome bonus for signing up",
            balanceAfter: newUser.credits,
        });

        // TODO: Trigger Kafka queue
        // await kafkaProducer.send({
        //   topic: "user.signup",
        //   messages: [{ value: JSON.stringify({ userId: newUser._id, email: newUser.email }) }],
        // });

        // Success response
        res.status(201).json({
            success: true,
            message: "User created successfully",
            userId: newUser._id,
            credits: newUser.credits,
        });

    } catch (error: unknown) {
        console.error("Signup error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
};


export const loginController = async (req: Request, res: Response) => {
    try {
        // Validation schema
        const schema = z.object({
            email: z.string().email(),
            password: z
                .string()
                .min(6, "Password must be at least 6 characters long")
                .regex(/[A-Z]/, "Password must include at least one uppercase letter")
                .regex(/[a-z]/, "Password must include at least one lowercase letter")
                .regex(/[^A-Za-z0-9]/, "Password must include at least one special character"),
        });

        if (!(process.env.JWT_SECRET || global?.secrets?.jwt_secret)) {
            throw new Error('JWT Secret is missing from both process.env and global.secrets');
        }

        // Validate input
        const { email, password } = schema.parse(req.body);

        // Check if user exists
        const existingUser = await UserModel.findOne({ email });
        if (!existingUser) throw new Error("User not found");

        // Verify password
        const hashed = existingUser.password;
        if (!hashed) throw new Error("Invalid credentials");

        const isVerified = await bcrypt.compare(password, hashed);
        if (!isVerified) throw new Error("Invalid credentials");

        // Generate JWT token
        const token = jwt.sign(
            { userId: existingUser._id, email: existingUser.email },
            process.env.JWT_SECRET || global?.secrets?.jwt_secret || "secret",
            { expiresIn: "1h" }
        );

        // Set cookie
        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 3600 * 1000, // 1 hour
        });

        // Success response
        res.status(200).json({
            success: true,
            message: "Login successful",
            userId: existingUser._id,
            token: token
        });

    } catch (error: unknown) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
};

export const forgetPassword = async (req: Request, res: Response) => {
    try {
        const schema = z.object({
            email: z.string().email(),
        });

        // Validate input
        const { email } = schema.parse(req.body);

        // Check if user exists
        const existingUser = await UserModel.findOne({ email });
        if (!existingUser) throw new Error("User not found");

        // Generate the OTP
        const otp = generateOTP();
        if (!otp) throw new Error("Failed to generate OTP");

        // Store OTP in DB
        const otpStored = await OtpModel.create({
            otp,
            email: existingUser.email,
            userId: existingUser._id,
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
        });
        if (!otpStored) throw new Error("Failed to store OTP");

        // TODO: send OTP via mail

        // Set cookies for OTP verification
        res.cookie("otpSent", "true", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 10 * 60 * 1000,
            sameSite: "lax",
        });

        res.cookie("otpEmail", email, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 10 * 60 * 1000,
            sameSite: "lax",
        });

        // Success response
        res.status(200).json({
            success: true,
            message: "OTP sent to email",
        });

    } catch (error: unknown) {
        console.error("Forget password error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
};

export const verifyOtp = async (req: Request, res: Response) => {
    try {
        const schema = z.object({
            otp: z.string().length(6, "OTP must be 6 digits"),
            email: z.string().email(),
        });

        const { otp, email } = schema.parse(req.body);

        // Find most recent OTP
        const storedOtp = await OtpModel.findOne({ email }).sort({ createdAt: -1 });

        if (!storedOtp) throw new Error("No OTP found. Please generate a new one.");
        if (storedOtp.expiresAt && storedOtp.expiresAt < new Date()) {
            throw new Error("OTP has expired. Please generate a new one.");
        }
        if (storedOtp.otp !== otp) throw new Error("Invalid OTP. Please try again.");

        // Optional: delete OTP after verification
        await OtpModel.deleteOne({ _id: storedOtp._id });

        // Set cookies to indicate verification and password reset window
        res.cookie("otpVerified", "true", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 10 * 60 * 1000,
            sameSite: "lax",
        });

        res.cookie("passwordResetAllowed", "true", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 10 * 60 * 1000,
            sameSite: "lax",
        });

        res.cookie("email", email, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            maxAge: 10 * 60 * 1000,
            sameSite: "lax",
        });

        res.clearCookie("otpSent");

        // Success response
        res.status(200).json({
            success: true,
            message: "OTP verified successfully",
        });

    } catch (error: unknown) {
        console.error("Verify OTP error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
};

export const resetPassword = async (req: Request, res: Response) => {
    try {
        const schema = z.object({
            email: z.string().email(),
            newPassword: z
                .string()
                .min(6, "Password must be at least 6 characters long")
                .regex(/[A-Z]/, "Password must include at least one uppercase letter")
                .regex(/[a-z]/, "Password must include at least one lowercase letter")
                .regex(/[^A-Za-z0-9]/, "Password must include at least one special character")
        });

        const { email, newPassword } = schema.parse(req.body);

        // Check if password reset window is still valid
        if (req.cookies.passwordResetAllowed !== "true") {
            throw new Error("Password reset session expired. Please re-verify OTP.");
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        // Update password
        await UserModel.updateOne(
            { email },
            { $set: { password: hashedPassword } }
        );

        // Clear the reset window cookies
        res.clearCookie("passwordResetAllowed");
        res.clearCookie("otpVerified");

        // TODO: send mail confirmation

        // Success response
        res.status(200).json({
            success: true,
            message: "Password reset successfully",
        });

    } catch (error: unknown) {
        console.error("Reset password error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
};

export const changePassword = async (req: Request, res: Response) => {
    try {
        const schema = z.object({
            email: z.string().email(),
            oldPassword: z
                .string()
                .min(6, "Password must be at least 6 characters long")
                .regex(/[A-Z]/, "Password must include at least one uppercase letter")
                .regex(/[a-z]/, "Password must include at least one lowercase letter")
                .regex(/[^A-Za-z0-9]/, "Password must include at least one special character"),
            newPassword: z
                .string()
                .min(6, "Password must be at least 6 characters long")
                .regex(/[A-Z]/, "Password must include at least one uppercase letter")
                .regex(/[a-z]/, "Password must include at least one lowercase letter")
                .regex(/[^A-Za-z0-9]/, "Password must include at least one special character")
        });

        const { email, newPassword, oldPassword } = schema.parse(req.body);

        const existingUser = await UserModel.findOne({ email });
        if (!existingUser) throw new Error("User not found");

        if (oldPassword === newPassword) throw new Error("Old and new password should be different");

        if (!existingUser.password) throw new Error("Account may be connected via GitHub");

        const isVerified = await bcrypt.compare(oldPassword, existingUser.password);
        if (!isVerified) throw new Error("Invalid old password");

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await existingUser.updateOne({ $set: { password: hashedPassword } });

        // Success response
        res.status(200).json({
            success: true,
            message: "Password changed successfully",
        });

    } catch (error: unknown) {
        console.error("Change password error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
};

export const deleteAccountController = async (req: AuthenticatedRequest, res: Response) => {
    const session = await mongoose.startSession();

    try {
        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ success: false, message: "Unauthenticated user" });
        }

        const user = await UserModel.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        session.startTransaction();

        await Promise.all([
            ProjectModel.deleteMany({ userId }).session(session),
            TokenModel.deleteMany({ userId }).session(session),
            DeploymentModel.deleteMany({ userId }).session(session),
            OtpModel.deleteMany({ userId }).session(session),
            UserModel.deleteOne({ _id: userId }).session(session),
        ]);

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            success: true,
            message: "Account and all related data deleted successfully.",
        });
    } catch (error: unknown) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error deleting account:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to delete account",
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
};

export const getUserController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new Error("Unauthenticated user");

        const user = await UserModel.findById(userId);
        if (!user) throw new Error("User not found");

        // Success response
        res.status(200).json({
            success: true,
            data: user,
        });

    } catch (error: unknown) {
        console.error("Error fetching user:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal server error",
        });
    }
};

export const logoutController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        // Clear authentication-related cookies
        const cookieOptions = {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax" as const,
        };

        res.clearCookie("token", cookieOptions);
        res.clearCookie("otpVerified", cookieOptions);
        res.clearCookie("passwordResetAllowed", cookieOptions);
        res.clearCookie("otpEmail", cookieOptions);
        res.clearCookie("otpSent", cookieOptions);

        // Success response
        res.status(200).json({
            success: true,
            message: "Logged out successfully",
        });

    } catch (error: unknown) {
        console.error("Logout error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal server error",
        });
    }
};

