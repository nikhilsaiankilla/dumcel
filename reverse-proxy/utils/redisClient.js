// redisClient.js
const { createClient } = require("redis");

let client;

async function connectRedis() {
    // Avoid reconnecting if already connected
    if (client && client.isOpen) {
        console.log("Redis already connected");
        return client;
    }

    try {
        let config = {};

        const { REDIS_HOST, REDIS_PORT, REDIS_USERNAME, REDIS_PASSWORD } = process.env;

        if (
            !(
                // either all env vars present
                (process.env.REDIS_HOST &&
                    process.env.REDIS_PORT &&
                    process.env.REDIS_USERNAME &&
                    process.env.REDIS_PASSWORD) ||
                // or all secrets present
                (global?.secrets?.redis_host &&
                    global?.secrets?.redis_port &&
                    global?.secrets?.redis_username &&
                    global?.secrets?.redis_password)
            )
        ) {
            throw new Error("Missing Redis configuration in both environment variables and secrets");
        }

        console.log("Using local Redis environment variables");

        config = {
            username: REDIS_USERNAME || global?.secrets?.redis_username,
            password: REDIS_PASSWORD || global?.secrets?.redis_password,
            socket: {
                host: REDIS_HOST || global?.secrets?.redis_host,
                port: Number(REDIS_PORT || global?.secrets?.redis_port),
            },
        };

        client = createClient(config);

        client.on("error", (err) => console.error("Redis Client Error:", err));
        client.on("connect", () => console.log("Redis Connected"));

        await client.connect();

        // Set global client for app-wide use
        global.redisClient = client;
        return client;
    } catch (err) {
        console.error("Redis Connection Failed:", err);
        throw err;
    }
}

module.exports = { connectRedis };
