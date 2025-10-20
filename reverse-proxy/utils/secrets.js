// utils/secrets.js
const { SecretsManagerClient, GetSecretValueCommand } = require('@aws-sdk/client-secrets-manager');

const secret_name = "production/dumcel/secrets";
const clientSecrets = new SecretsManagerClient({ region: "ap-south-1" });

let cachedSecrets = null;

/**
 * Fetch secrets from AWS Secrets Manager (with simple caching)
 */
async function getSecrets() {
    if (cachedSecrets) return cachedSecrets;

    try {
        const response = await clientSecrets.send(
            new GetSecretValueCommand({
                SecretId: secret_name,
                VersionStage: "AWSCURRENT",
            })
        );

        cachedSecrets = JSON.parse(response.SecretString);
        return cachedSecrets;
    } catch (error) {
        console.error("Failed to fetch secrets from Secrets Manager", error);
        throw error;
    }
}

module.exports = { getSecrets };
