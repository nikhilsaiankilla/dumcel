const mongoose = require("mongoose");
const { getSecrets } = require("./utils/secrets");

async function connectDb() {
    // Avoid reconnecting if already connected
    if (mongoose.connection.readyState === 1) {
        console.log("Already connected to MongoDB.");
        return;
    }

    try {
        let URI = process.env.MONGO_DB_URI || global?.secrets?.mongoDb_uri

        if(!URI) throw new Error("MongoDB URI not found in environment variables or global secrets.");
        
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
