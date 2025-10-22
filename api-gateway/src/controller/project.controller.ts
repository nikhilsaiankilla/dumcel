import { Response } from "express";
import { z } from "zod";
import { RunTaskCommand } from "@aws-sdk/client-ecs";
import { ProjectModel } from "../model/project.model";
import { generateSlug } from "random-word-slugs";
import { DeploymentModel, DeploymentState } from "../model/deployment.model";
import { AuthenticatedRequest } from "../middleware/auth.middleware";
import { UserModel } from "../model/user.model";
import { CreditTransactionModel } from "../model/creditTransaction.model";
import { TokenModel } from "../model/tokens.model";

export const projectController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const schema = z.object({
            name: z.string(),
            gitUrl: z.string(),
            subDomain: z.string().optional(),
        });

        const userId = req?.user?.userId;
        if (!userId) throw new Error("Unauthenticated user");

        const safeParseResult = schema.safeParse(req.body);
        if (!safeParseResult.success) throw new Error(safeParseResult.error.message || "Required all fields");

        const { name, gitUrl, subDomain } = safeParseResult.data;

        // Fetch user to check credits
        const user = await UserModel.findById(userId);
        if (!user) throw new Error("User not found");

        if (user.credits < 10) throw new Error("Not enough credits. You need at least 10 credits to create a project.");

        // Create project first
        const project = await ProjectModel.create({
            projectName: name,
            userId: userId,
            gitUrl,
            subDomain: subDomain || generateSlug(),
        });

        // Deduct 10 credits after successful creation
        try {
            user.credits -= 10;
            await user.save();

            await CreditTransactionModel.create({
                userId: user._id,
                type: "debit",
                amount: 10,
                reason: `${name} Project creation`,
                balanceAfter: user.credits,
            });
        } catch (creditError) {
            console.error("Credit deduction failed:", creditError);
            // Optional: notify admin or rollback project if needed
        }

        // Success response
        res.status(200).json({
            success: true,
            data: { project },
        });

    } catch (error: unknown) {
        console.error("Project creation error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
};

export const deployController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const secrets = global.secrets;
        const { projectId } = req.params;
        const { env } = req.body;

        if (!projectId) throw new Error("Project ID is required");

        const project = await ProjectModel.findById(projectId);
        if (!project) throw new Error("Project not found");

        const userId = req.user?.userId;
        if (!userId) throw new Error("Unauthenticated user");

        if (!secrets) throw new Error("Server secrets not initialized");

        const deployment = await DeploymentModel.create({
            projectId,
            state: DeploymentState.QUEUED,
            userId,
        });

        const userTokenDoc = await TokenModel.findOne({ user: userId });
        if (!userTokenDoc?.accessToken) throw new Error("Git token not found for user");

        const gitToken = userTokenDoc.accessToken;

        const authEnv = [{ name: "GIT_TOKEN", value: gitToken }];

        // Convert user env object to ECS-compatible environment array
        const envArray =
            env && typeof env === "object"
                ? Object.entries(env).map(([key, value]) => ({ name: key, value: String(value) }))
                : [];

        // Always include base variables required for build
        const baseEnv = [
            { name: "PROJECT_ID", value: projectId },
            { name: "DEPLOYMENT_ID", value: deployment.id },
            { name: "SUB_DOMAIN", value: project.subDomain },
            { name: "GIT_REPO_URL", value: project.gitUrl },
        ];

        const allEnvVars = [...baseEnv, ...envArray, ...authEnv];

        const command = new RunTaskCommand({
            cluster: secrets.CLUSTER,
            taskDefinition: secrets.TASK,
            launchType: "FARGATE",
            count: 1,
            networkConfiguration: {
                awsvpcConfiguration: {
                    assignPublicIp: "ENABLED",
                    subnets: [secrets.subnets_1, secrets.subnets_2, secrets.subnets_3],
                    securityGroups: [secrets.security_group],
                },
            },
            overrides: {
                containerOverrides: [
                    {
                        name: secrets.builder_image,
                        environment: allEnvVars,
                    },
                ],
            },
        });

        await global.ecsClient.send(command);

        // Success response
        res.status(200).json({
            success: true,
            message: "Deployment queued successfully",
            data: {
                projectId,
                deploymentId: deployment.id,
                subDomain: project.subDomain,
            },
        });

    } catch (error: unknown) {
        console.error("Deploy error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
};

export const logsController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new Error("Unauthenticated user");

        const { deploymentId } = req.params;
        if (!deploymentId) throw new Error("Deployment ID is required");

        const { lastTimestamp, limit } = req.query;

        // Default values
        const limitValue = Number(limit) || 500; // fetch up to 500 lines at once
        const lastTimestampValue = lastTimestamp || "1970-01-01 00:00:00";

        if (!global.clickhouseClient) throw new Error("ClickHouse client not initialized");

        // Query ClickHouse
        const query = `
            SELECT 
                event_id, 
                project_id, 
                deployment_id, 
                log, 
                timestamp, 
                type, 
                step, 
                meta
            FROM log_events
            WHERE deployment_id = {deployment_id:String}
            AND timestamp > {lastTimestamp:DateTime}
            ORDER BY timestamp ASC
            LIMIT {limit:Int32}
        `;

        const logsResponse = await global.clickhouseClient.query({
            query,
            query_params: {
                deployment_id: deploymentId,
                lastTimestamp: lastTimestampValue,
                limit: limitValue,
            },
            format: "JSONEachRow",
        });

        const rawLogs = await logsResponse.json();

        // Success response
        res.status(200).json({
            success: true,
            data: {
                count: rawLogs.length,
                lastTimestamp:
                    rawLogs.length > 0 ? rawLogs[rawLogs.length - 1].timestamp : lastTimestampValue,
                logs: rawLogs,
            },
        });

    } catch (error: unknown) {
        console.error("Error fetching logs:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
};

export const getProjectController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new Error("Unauthenticated user");

        const { projectId } = req.params;
        if (!projectId) throw new Error("Project ID is required");

        const project = await ProjectModel.findById(projectId).lean();
        if (!project) throw new Error("Project not found");

        const latestDeployment = await DeploymentModel.findOne({ projectId })
            .sort({ createdAt: -1 })
            .lean();

        const projectWithDeploymentId = {
            ...project,
            deployment: {
                latestDeploymentId: latestDeployment?._id || null,
                state: latestDeployment?.state || "not started",
            },
        };

        res.status(200).json({
            success: true,
            data: projectWithDeploymentId,
        });

    } catch (error: unknown) {
        console.error("Get project error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
};

export const getAllProjectsController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new Error("Unauthenticated user");

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        const [projects, totalCount] = await Promise.all([
            ProjectModel.find({ userId })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit),
            ProjectModel.countDocuments({ userId }),
        ]);

        res.status(200).json({
            success: true,
            data: {
                projects,
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
        console.error("Get all projects error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
};


export const getAllDeploymentsController = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new Error("Unauthenticated user");

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const state = req.query.state as string | undefined;
        const skip = (page - 1) * limit;

        // Build filter object
        const filter: Record<string, any> = { userId };
        if (state) filter.state = state;

        const [deployments, totalCount] = await Promise.all([
            DeploymentModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: "projectId",
                    select: "_id projectName subDomain updatedAt",
                }),
            DeploymentModel.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            data: {
                deployments,
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
        console.error("Get all deployments error:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
};

export const getAllDeploymentsForProjectController = async (
    req: AuthenticatedRequest,
    res: Response
) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new Error("Unauthenticated user");

        const { projectId } = req.params;
        if (!projectId) throw new Error("Project ID is required");

        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const state = req.query.state as string | undefined;
        const skip = (page - 1) * limit;

        const filter: Record<string, any> = { projectId };
        if (state) filter.state = state;

        const [deployments, totalCount] = await Promise.all([
            DeploymentModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .populate({
                    path: "projectId",
                    select: "_id projectName subDomain updatedAt",
                }),
            DeploymentModel.countDocuments(filter),
        ]);

        res.status(200).json({
            success: true,
            data: {
                deployments,
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
        console.error("Error fetching project deployments:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
};

export const deleteProjectHandler = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        if (!userId) throw new Error("Unauthenticated user");

        const { projectId } = req.params;
        if (!projectId) throw new Error("Project ID is required");

        // Find project
        const project = await ProjectModel.findById(projectId);
        if (!project) throw new Error("Project not found");

        // Ensure user owns the project
        if (project.userId.toString() !== userId) throw new Error("You are not authorized to delete this project");

        // Delete the project
        await ProjectModel.findByIdAndDelete(projectId);

        res.status(200).json({
            success: true,
            message: "Project deleted successfully",
            projectId,
        });

    } catch (error: unknown) {
        console.error("Error deleting project:", error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : "Internal Server Error",
        });
    }
};

export const checkSubDomain = async (req: AuthenticatedRequest, res: Response) => {
    try {
        const schema = z.object({
            subDomain: z
                .string()
                .min(1, "Subdomain is required")
                .regex(/^[a-z0-9-]+$/, "Subdomain must contain only lowercase letters, numbers, and hyphens"),
        });

        const { subDomain } = schema.parse(req.query);

        const existingProject = await ProjectModel.findOne({
            subDomain, // fixed: field name should match schema
        });

        const available = !existingProject;
        const message = available
            ? "Subdomain is available."
            : "Subdomain is already taken.";

        res.status(200).json({
            success: true,
            available,
            message,
        });

    } catch (error: unknown) {
        console.error("Error checking subdomain:", error);

        if (error instanceof z.ZodError) {
            return res.status(400).json({
                success: false,
                error: "Validation Error",
                message: error.message,
            });
        }

        res.status(500).json({
            success: false,
            error: "Server Error",
            message: "Failed to check subdomain availability.",
        });
    }
};
