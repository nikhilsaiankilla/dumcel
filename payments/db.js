const mongoose = require("mongoose");
const { getSecrets } = require("./utils/secrets");

async function connectDb() {
    // Avoid reconnecting if already connected
    if (mongoose.connection.readyState === 1) {
        console.log("Already connected to MongoDB.");
        return;
    }

    try {
        let URI;

        // Use environment variable in development
        if (process.env.NODE_ENV === "development") {
            URI = process.env.MONGO_DB_URI;
            if (!URI) throw new Error("Missing MONGO_DB_URI in development environment");
            console.log("Using local env MongoDB URI");
        } else {
            // In production, fetch from secret manager
            const secrets = await getSecrets();
            global.secrets = secrets;
            URI = secrets.mongoDb_uri;
            console.log("Using production secret MongoDB URI");
        }

        await mongoose.connect(URI);
        console.log("Successfully connected to MongoDB!");
    } catch (err) {
        console.error("MongoDB connection error:", err);
        process.exit(1);
    }
}


// Graceful shutdown
process.on("SIGINT", async () => {
    await mongoose.connection.close();
    console.log("MongoDB connection closed.");
    process.exit(0);
});

module.exports = { connectDb };
