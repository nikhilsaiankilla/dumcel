import { ECSClient } from "@aws-sdk/client-ecs";
import { Kafka } from "kafkajs";
import { createClient } from "@clickhouse/client";

declare global {
    var ecsClient: any | undefined;
    var kafka: any | undefined;
    var clickhouseClient: any | undefined;
}

export const initConfigs = () => {

    const isMissingAwsSecrets =
        (!(process.env.ACCESS_KEY_ID || global.secrets?.accessKeyId) ||
            !(process.env.SECRET_ACCESS_KEY || global.secrets?.secretAccessKey) ||
            !(process.env.KAFKA_CA_CERTIFICATE || global.secrets?.kafka_ca_certificate));

    if (isMissingAwsSecrets) {
        throw new Error("AWS or Kafka secrets are missing from both process.env and global.secrets.");
    }

    const ecsClient = new ECSClient({
        region: "ap-south-1",
        credentials: {
            accessKeyId: process.env.ACCESS_KEY_ID || global?.secrets?.accessKeyId,
            secretAccessKey: process.env.SECRET_ACCESS_KEY || global?.secrets?.secretAccessKey
        }
    });

    const kafka = new Kafka({
        clientId: `api-server`,
        brokers: [process.env.KAFKA_BROKER || global?.secrets?.kafka_broker],
        ssl: {
            rejectUnauthorized: false,
            ca: [process.env.KAFKA_CA_CERTIFICATE || global?.secrets?.kafka_ca_certificate.trim()]
        },
        sasl: {
            username: process.env.KAFKA_USER_NAME || global?.secrets?.kafka_user_name,
            password: process.env.KAFKA_PASSWORD || global?.secrets?.kafka_password,
            mechanism: "plain"
        }
    });

    const clickhouseClient = createClient({
        url: process.env.CLICKHOUSE_URL || global?.secrets?.clickhouse_url,
        database: process.env.DATABASE || global?.secrets?.database,
        username: process.env.CLICKHOUSE_USER_NAME || global?.secrets?.clickhouse_user_name,
        password: process.env.CLICKHOUSE_PASSWORD || global?.secrets?.clickhouse_password
    });

    global.ecsClient = ecsClient;
    global.kafka = kafka;
    global.clickhouseClient = clickhouseClient;

    console.log('Intialised the clickhouse and kafka');
} 