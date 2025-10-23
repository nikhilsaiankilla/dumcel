const { Kafka, Partitioners } = require("kafkajs");

const kafkaConnect = async () => {
    // Avoid duplicate connections
    if (global.producer) {
        console.log("Kafka producer already connected");
        return global.producer;
    }

    try {
        let config = {};

        const broker = process.env.KAFKA_BROKER || global?.secrets?.kafka_broker;
        const user = process.env.KAFKA_USER_NAME || global?.secrets?.kafka_user_name;
        const password = process.env.KAFKA_PASSWORD || global?.secrets?.kafka_password;
        const caCert = process.env.KAFKA_CA_CERTIFICATE || global?.secrets?.kafka_ca_certificate;

        if(!broker || !user || !password || !caCert){
            throw new Error("Missing Kafka environment variables");
        }

        config = {
            brokers: [broker],
            ssl: {
                rejectUnauthorized: false,
                ca: [caCert?.trim()],
            },
            sasl: {
                username: user,
                password: password,
                mechanism: "plain",
            },
        };

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
