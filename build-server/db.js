const mongoose = require("mongoose");

async function connectDb() {
    // Avoid reconnecting if already connected
    if (mongoose.connection.readyState === 1) {
        console.log("Already connected to MongoDB.");
        return;
    }

    try {
        if (!(process.env.MONGO_DB_URI || global.secrets?.mongoDb_uri)) {
            throw new Error("MongoDB URI is not defined in secrets");
        }

        await mongoose.connect(process.env.MONGO_DB_URI || global.secrets?.mongoDb_uri);
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
