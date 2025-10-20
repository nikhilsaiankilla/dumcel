const { Kafka, Partitioners } = require("kafkajs");
const { getSecrets } = require("./secrets");

const kafkaConnect = async () => {
    // Avoid duplicate connections
    if (global.producer) {
        console.log("Kafka producer already connected");
        return global.producer;
    }

    try {
        let config = {};

        if (process.env.NODE_ENV === "development") {
            // --- Development (local) ---
            const broker = process.env.KAFKA_BROKER;
            const user = process.env.KAFKA_USER_NAME;
            const password = process.env.KAFKA_PASSWORD;
            const caCert = process.env.KAFKA_CA_CERTIFICATE;

            if (!broker || !user || !password || !caCert) {
                throw new Error("Missing Kafka environment variables in development");
            }

            console.log("Using local Kafka environment variables");

            config = {
                brokers: [broker],
                ssl: {
                    rejectUnauthorized: false,
                    ca: [caCert.trim()],
                },
                sasl: {
                    username: user,
                    password,
                    mechanism: "plain",
                },
            };
        } else {
            // --- Production (cloud) ---
            const secrets = await getSecrets();
            global.secrets = secrets;

            console.log("Using production Kafka secrets");

            config = {
                brokers: [secrets.kafka_broker],
                ssl: {
                    rejectUnauthorized: false,
                    ca: [secrets.kafka_ca_certificate?.trim()],
                },
                sasl: {
                    username: secrets.kafka_user_name,
                    password: secrets.kafka_password,
                    mechanism: "plain",
                },
            };
        }

        const kafka = new Kafka({
            clientId: "reverse-proxy",
            ...config,
        });

        const producer = kafka.producer({
            createPartitioner: Partitioners.LegacyPartitioner,
        });

        await producer.connect();
        global.producer = producer;

        console.log("Kafka producer connected");
        return producer;
    } catch (error) {
        console.error("Kafka connection failed:", error);
        throw error;
    }
};

const pushAnalyticsToKafka = async (topic, message) => {
    if (!global.producer) {
        console.warn("Kafka producer not connected — attempting to connect...");
        await kafkaConnect();
    }

    try {
        await global.producer.send({
            topic,
            messages: [{ key: "analytics", value: JSON.stringify(message) }],
        });
    } catch (err) {
        console.error("Kafka push failed:", err);
    }
};

module.exports = { kafkaConnect, pushAnalyticsToKafka };
