// redisClient.js
const { createClient } = require("redis");
const { getSecrets } = require("./secrets");

let client;

async function connectRedis() {
    // Avoid reconnecting if already connected
    if (client && client.isOpen) {
        console.log("Redis already connected");
        return client;
    }

    try {
        let config = {};

        if (process.env.NODE_ENV === "development") {
            // --- Development (use .env) ---
            const { REDIS_HOST, REDIS_PORT, REDIS_USERNAME, REDIS_PASSWORD } = process.env;

            if (!REDIS_HOST || !REDIS_PORT) {
                throw new Error("Missing Redis environment variables in development");
            }

            console.log("Using local Redis environment variables");

            config = {
                username: REDIS_USERNAME,
                password: REDIS_PASSWORD,
                socket: {
                    host: REDIS_HOST,
                    port: Number(REDIS_PORT),
                },
            };
        } else {
            // --- Production (fetch from secrets) ---
            const secrets = await getSecrets();
            global.secrets = secrets;

            console.log("Using production Redis secrets");

            config = {
                username: secrets.redis_username,
                password: secrets.redis_password,
                socket: {
                    host: secrets.redis_host,
                    port: Number(secrets.redis_port),
                },
            };
        }

        client = createClient(config);

        client.on("error", (err) => console.error("Redis Client Error:", err));
        client.on("connect", () => console.log("Redis Connected"));

        await client.connect();
        return client;
    } catch (err) {
        console.error("Redis Connection Failed:", err);
        throw err;
    }
}

module.exports = { connectRedis };
