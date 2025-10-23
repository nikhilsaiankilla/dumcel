import express, { Request, Response } from "express";
import { projectRouter } from './router/project.router';
import { authenticationRouter } from "./router/authentication.router";
import { connectDb } from "./utils/connectDb";
import cookieParser from "cookie-parser";
import { initSecrets } from "./utils/secrets";
import { DeploymentModel, DeploymentState } from "./model/deployment.model";
import { v4 } from 'uuid'
import { initConfigs } from "./utils/initConfigs";
import cors from 'cors'
import { githubRouter } from "./router/github.routes";
import dotenv from "dotenv";
import { analyticsRouter } from "./router/analytics.router";
import { creditsRouter } from "./router/credits.router";

dotenv.config();
const app = express()

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));

app.use(express.json());
app.use(cookieParser());

// ---------- Kafka Consumer Setup ----------
interface KafkaClient {
    consumer: (options: { groupId: string }) => Consumer;
}

interface Consumer {
    connect(): Promise<void>;
    subscribe(options: { topic: string; fromBeginning: boolean }): Promise<void>;
    run(options: { eachBatch: (payload: EachBatchPayload) => Promise<void> }): Promise<void>;
}

interface EachBatchPayload {
    batch: Batch;
    heartbeat: () => Promise<void>;
    commitOffsetsIfNecessary: (offset: string) => Promise<void> | void;
    resolveOffset: (offset: string) => void;
}

interface Batch {
    messages: Message[];
}

interface Message {
    value: Buffer | string | null;
    key?: Buffer | string | null;
    offset: string;
}

interface ClickHouseClient {
    insert(options: {
        table: string;
        values: Record<string, unknown>[];
        format?: string;
    }): Promise<ClickHouseInsertResult>;
}

interface ClickHouseInsertResult {
    // minimal shape — expand if you need more fields from the CH driver result
    rows?: number;
    [key: string]: unknown;
}

interface LogPayload {
    PROJECT_ID: string;
    DEPLOYMENT_ID: string;
    log: string;
    type?: string;
    step?: string;
    meta?: Record<string, unknown>;
}

interface DeploymentStatusPayload {
    DEPLOYMENT_ID: string;
    STATUS: string;
}

async function initKafkaConsumer(kafka: KafkaClient, clickhouseClient: ClickHouseClient): Promise<void> {
    const consumer: Consumer = kafka.consumer({ groupId: "api-server-logs-consumer" });

    await consumer.connect();
    await consumer.subscribe({ topic: "container-log", fromBeginning: false });
    await consumer.subscribe({ topic: "deployment-status-events", fromBeginning: false });
    await consumer.subscribe({ topic: "project-analytics", fromBeginning: false });

    await consumer.run({
        eachBatch: async function ({
            batch,
            heartbeat,
            commitOffsetsIfNecessary,
            resolveOffset,
        }: EachBatchPayload) {
            const messages: Message[] = batch.messages;

            for (const message of messages) {
                const stringMessages: string = message.value!.toString();
                const key: string | undefined = message.key?.toString();

                try {
                    if (key === "log") {
                        const {
                            PROJECT_ID,
                            DEPLOYMENT_ID,
                            log,
                            type = "INFO",
                            step = "general",
                            meta = {},
                        } = JSON.parse(stringMessages) as LogPayload;

                        await clickhouseClient.insert({
                            table: "log_events",
                            values: [
                                {
                                    event_id: v4(),
                                    timestamp: new Date().toISOString().slice(0, 19).replace("T", " "),
                                    deployment_id: DEPLOYMENT_ID,
                                    log: typeof log === "string" ? log : JSON.stringify(log),
                                    metadata: JSON.stringify({
                                        project_id: PROJECT_ID,
                                        type,
                                        step,
                                        ...meta,
                                    }),
                                },
                            ],
                            format: "JSONEachRow",
                        });
                    } else if (key === "deployment-status") {
                        const { DEPLOYMENT_ID, STATUS } = JSON.parse(stringMessages) as DeploymentStatusPayload;

                        let DEPLOYMENT_STATUS: any = DeploymentState.QUEUED;

                        if (STATUS === "failed") DEPLOYMENT_STATUS = DeploymentState.FAILED;
                        else if (STATUS === "success") DEPLOYMENT_STATUS = DeploymentState.READY;
                        else if (STATUS === "in_progress") DEPLOYMENT_STATUS = DeploymentState.IN_PROGRESS;

                        await DeploymentModel.findByIdAndUpdate(
                            { _id: DEPLOYMENT_ID },
                            { $set: { state: DEPLOYMENT_STATUS } }
                        );
                    } else if (key === 'analytics') {
                        const { projectId, subDomain, ip, country, latitude, longitude, timestamp, referrer, deviceType, browser, os, acceptLanguage, userAgent, authorization } = JSON.parse(stringMessages);

                        const res = await clickhouseClient.insert({
                            table: 'project_analytics',
                            values: [
                                {
                                    event_id: v4(),
                                    timestamp: new Date(timestamp).toISOString().slice(0, 19).replace("T", " "),
                                    project_id: projectId,
                                    sub_domain: subDomain,
                                    ip,
                                    country,
                                    latitude,
                                    longitude,
                                    referrer,
                                    device_type: deviceType,
                                    browser,
                                    os,
                                    accept_language: acceptLanguage,
                                    user_agent: userAgent,
                                    authorization
                                },
                            ],
                            format: 'JSONEachRow'
                        })
                    }

                    commitOffsetsIfNecessary(message.offset);
                    resolveOffset(message.offset);
                    await heartbeat();
                } catch (error) {
                    console.error("Error processing message:", error);
                }
            }
        },
    });
}

app.get("/", (req: Request, res: Response) => {
    res.send("Hello TypeScript with Node.js and Express!");
});

app.use("/api/auth", authenticationRouter);

app.use('/api/github', githubRouter)

app.use("/api/project", projectRouter);

app.use('/api/analytics', analyticsRouter);

app.use('/api/credits', creditsRouter);

app.get('/health', (req: Request, res: Response) => {
    res.status(200).send('OK');
})

const PORT = process.env.PORT || 8000;

app.listen(PORT, async () => {
    // await initSecrets();
    await connectDb()
    initConfigs();

    await initKafkaConsumer(global.kafka, global.clickhouseClient)
    console.log(`Server running on port ${PORT}`)
});
