// ------------------- Imports -------------------
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { Kafka, Partitioners } = require('kafkajs');
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');
const { DeploymentModel, DeploymentState } = require('./models/deploymentModel');
const ProjectModel = require('./models/project');
const { default: mongoose } = require('mongoose');
const cloudinary = require('cloudinary').v2;

// ------------------- Constants -------------------
const PROJECT_ID = process.env.PROJECT_ID;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;
const REGION = 'ap-south-1';
const SECRET_NAME = 'production/dumcel/secrets';
const OUTPUT_PATH = path.join(__dirname, 'output');
const DIST_PATH = path.join(OUTPUT_PATH, 'dist');
const KAFKA_TOPIC_LOGS = 'container-log';
const KAFKA_TOPIC_DEPLOYMENT = 'deployment-status-events';
const S3_BUCKET = 'dumcel-build-outputs';

// ------------------- AWS Secrets Manager -------------------
const secretsClient = new SecretsManagerClient({ region: REGION });
async function getSecrets() {
    const response = await secretsClient.send(
        new GetSecretValueCommand({ SecretId: SECRET_NAME, VersionStage: 'AWSCURRENT' })
    );
    return JSON.parse(response.SecretString);
}

// ------------------- MongoDB -------------------
async function connectDb(mongoUri) {
    if (mongoose.connection.readyState === 1) return;

    await mongoose.connect(mongoUri);
    console.log('MongoDB connected');
}

async function updateProject(projectId, update) {
    const res = await DeploymentModel.findOneAndUpdate(
        { where: { projectId: projectId } },
        { ...update },
        { new: true }
    );
    console.log(`updated project status `, res)
}

async function updateProjectFavicon(projectId, update) {
    const res = await ProjectModel.findByIdAndUpdate(
        { projectId },
        { ...update },
        { new: true }
    );
    console.log(`updated project favicon `, res)
}

// ------------------- Main -------------------
async function main() {
    const secrets = await getSecrets();
    await connectDb(process.env.MONGO_DB_URI || secrets.mongoDb_uri);

    await updateProject(PROJECT_ID, {
        state: DeploymentState.QUEUED
    })

    // ------------------- S3 Setup -------------------
    const s3Client = new S3Client({
        region: REGION,
        credentials: {
            accessKeyId: secrets.accessKeyId,
            secretAccessKey: secrets.secretAccessKey,
        },
    });

    // ------------------- Kafka Setup -------------------
    // const kafka = new Kafka({
    //     clientId: `docker-build-server-${DEPLOYMENT_ID}`,
    //     brokers: ['kafka-30a9f1ba-nikhilsaiankilla-744b.j.aivencloud.com:22073'],
    //     ssl: {
    //         ca: [fs.readFileSync(path.join(__dirname, 'kafka.pem'), 'utf-8')],
    //     },
    //     sasl: {
    //         username: secrets.kafka_user_name,
    //         password: secrets.kafka_password,
    //         mechanism: 'plain',
    //     },
    // });

    cloudinary.config({
        cloud_name: secrets.cloudinary_cloud_name,
        api_key: secrets.cloudinary_api_key,
        api_secret: secrets.cloudinary_api_secret,
    });

    // const producer = kafka.producer({ createPartitioner: Partitioners.LegacyPartitioner });
    // await producer.connect();

    // ------------------- Helper Logging Functions -------------------
    async function logLine(message, type = 'INFO', step = 'general', meta = {}) {
        // const logObj = {
        //     PROJECT_ID,
        //     DEPLOYMENT_ID,
        //     timestamp: new Date().toISOString(),
        //     message,
        //     type,
        //     step,
        //     meta,
        // };
        // await producer.send({
        //     topic: KAFKA_TOPIC_LOGS,
        //     messages: [{ key: 'log', value: JSON.stringify(logObj) }],
        // });
        console.log(`[${logObj.timestamp}] [${step}] ${message}`);
    }

    async function updateDeploymentStatus(status) {
        // await producer.send({
        //     topic: KAFKA_TOPIC_DEPLOYMENT,
        //     messages: [
        //         {
        //             key: 'deployment-status',
        //             value: JSON.stringify({ DEPLOYMENT_ID, STATUS: status, timestamp: new Date().toISOString() }),
        //         },
        //     ],
        // });
        await logLine(`Deployment status: ${status}`, status === 'failed' ? 'ERROR' : 'SUCCESS', 'deploy');
    }

    // ------------------- Run Build Script -------------------
    await updateDeploymentStatus('in_progress');
    await logLine('Starting React project build...', 'INFO', 'deploy');

    // ------------------- Inject Environment Variables -------------------
    const envFilePath = path.join(OUTPUT_PATH, '.env');

    const envEntries = Object.entries(process.env)
        .filter(
            ([key]) =>
                ![
                    'PATH',
                    'HOME',
                    'HOSTNAME',
                    'NODE_VERSION',
                    'NODE_ENV',
                    'npm_config_cache',
                    'npm_config_prefix',
                    'PWD',
                ].includes(key) && !key.startsWith('AWS_')
        )
        .map(([key, value]) => `${key}=${value}`);

    fs.writeFileSync(envFilePath, envEntries.join('\n'));
    await logLine(`.env file generated with ${envEntries.length} custom environment variables.`, 'INFO', 'build');

    // ------------------- Run React Build -------------------
    const buildCommand = `cd ${OUTPUT_PATH} && npm install && npm run build`;

    await logLine(`Executing build command: ${buildCommand}`, 'INFO', 'build');

    const buildProcess = exec(buildCommand);

    buildProcess.stdout.on('data', async (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
            await logLine(line, 'INFO', 'build-output');
        }
    });

    buildProcess.stderr.on('data', async (chunk) => {
        const lines = chunk.toString().split('\n').filter(Boolean);
        for (const line of lines) {
            await updateProject(PROJECT_ID, { state: DeploymentState.FAILED });
            await logLine(line, 'ERROR', 'build-output');
        }
    });

    buildProcess.on('close', async (code) => {
        if (code !== 0) {
            await logLine(`Build failed with exit code ${code}`, 'ERROR', 'build');
            await updateDeploymentStatus('failed');
            await updateProject(PROJECT_ID, { state: DeploymentState.FAILED });
            // await producer.disconnect();
            await mongoose.connection.close();
            return;
        }

        await logLine('Build finished successfully.', 'SUCCESS', 'build');

        // ------------------- Upload to S3 -------------------
        await logLine('Uploading build files to S3...', 'INFO', 'upload');
        try {
            const files = fs.readdirSync(DIST_PATH, { recursive: true });

            for (const file of files) {
                const filePath = path.join(DIST_PATH, file);
                if (fs.lstatSync(filePath).isDirectory()) continue;

                await logLine(`Uploading file: ${file}`, 'INFO', 'upload', { file });
                await s3Client.send(
                    new PutObjectCommand({
                        Bucket: S3_BUCKET,
                        Key: `_output/${PROJECT_ID}/${file}`,
                        Body: fs.createReadStream(filePath),
                        ContentType: mime.lookup(filePath) || 'application/octet-stream',
                    })
                );
                await logLine(`Uploaded file: ${file}`, 'SUCCESS', 'upload', { file });
            }

            await logLine('All files uploaded successfully!', 'SUCCESS', 'upload');
            await updateDeploymentStatus('success');
            await updateProject(PROJECT_ID, { state: DeploymentState.READY });
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await logLine(`Upload failed: ${errorMessage}`, 'ERROR', 'upload');

            await updateDeploymentStatus('failed');
            await updateProject(PROJECT_ID, { state: DeploymentState.FAILED });
        }

        // ------------------- Upload Favicon to Cloudinary -------------------
        await logLine('Searching for favicon to upload...', 'INFO', 'favicon');

        try {
            // Common favicon locations in React build output
            const possiblePaths = [
                // --- Generic Favicons ---
                path.join(DIST_PATH, 'favicon.ico'),
                path.join(DIST_PATH, 'favicon.png'),
                path.join(DIST_PATH, 'assets', 'favicon.ico'),
                path.join(DIST_PATH, 'assets', 'favicon.png'),

                path.join(OUTPUT_PATH, 'public', 'favicon.ico'),
                path.join(OUTPUT_PATH, 'public', 'favicon.png'),

                // --- Framework-specific Icons ---
                // Vite
                path.join(DIST_PATH, 'vite.svg'),
                path.join(OUTPUT_PATH, 'public', 'vite.svg'),

                // React (CRA)
                path.join(DIST_PATH, 'logo192.png'),
                path.join(DIST_PATH, 'logo512.png'),
                path.join(OUTPUT_PATH, 'public', 'logo192.png'),
                path.join(OUTPUT_PATH, 'public', 'logo512.png'),

                // Next.js
                path.join(DIST_PATH, 'next.svg'),
                path.join(DIST_PATH, 'vercel.svg'),
                path.join(OUTPUT_PATH, 'public', 'next.svg'),
                path.join(OUTPUT_PATH, 'public', 'vercel.svg'),

                // Vue
                path.join(DIST_PATH, 'vue.svg'),
                path.join(OUTPUT_PATH, 'public', 'vue.svg'),

                // Angular
                path.join(DIST_PATH, 'angular.svg'),
                path.join(OUTPUT_PATH, 'public', 'angular.svg'),
            ];

            const faviconPath = possiblePaths.find((p) => fs.existsSync(p));

            if (!faviconPath) {
                await logLine('No favicon found in build output.', 'WARN', 'favicon');
            } else {
                await logLine(`Favicon found: ${faviconPath}`, 'INFO', 'favicon');

                const uploadResponse = await cloudinary.uploader.upload(faviconPath, {
                    folder: 'dumcel_favicons',
                    public_id: `favicon_${PROJECT_ID}_${DEPLOYMENT_ID}`,
                    overwrite: true,
                    resource_type: 'image',
                });

                await logLine(`Favicon uploaded to Cloudinary: ${uploadResponse.secure_url}`, 'SUCCESS', 'favicon', {
                    url: uploadResponse.secure_url,
                });

                const faviconMeta = {
                    SRC: uploadResponse.secure_url,
                    PROJECT_ID,
                }

                // await producer.send({
                //     topic: KAFKA_TOPIC_LOGS,
                //     messages: [{ key: 'favicon', value: JSON.stringify(faviconMeta) }],
                // });
                await updateProjectFavicon(PROJECT_ID, { favicon: uploadResponse.secure_url });
            }

            // await producer.disconnect();
            await mongoose.connection.close();
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            await logLine(`Favicon upload failed: ${errorMessage}`, 'ERROR', 'favicon');

            // await producer.disconnect();
            await mongoose.connection.close();
        }
    });
}

// ------------------- Entry Point -------------------
main().catch(async (err) => {
    console.error('Deployment failed:', err);
    try {
        await updateProject(PROJECT_ID, {
            state: DeploymentState.FAILED
        })
        // await producer?.disconnect();
        await mongoose.connection.close();
    } catch { }
    process.exit(1);
});
