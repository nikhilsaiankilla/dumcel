const mongoose = require("mongoose");
const { Schema } = mongoose;

// ------------------- Deployment States -------------------
const DeploymentState = {
    QUEUED: "queued",
    NOT_STARTED: "not started",
    IN_PROGRESS: "in progress",
    READY: "ready",
    FAILED: "failed",
};

// ------------------- Deployment Schema -------------------
const DeploymentSchema = new Schema({
    projectId: {
        type: Schema.Types.ObjectId,
        ref: "Project",
        required: true,
    },
    state: {
        type: String,
        enum: Object.values(DeploymentState),
        default: DeploymentState.NOT_STARTED,
        required: true,
    },
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
    updatedAt: {
        type: Date,
        default: Date.now,
    },
});

// ------------------- Hooks -------------------
DeploymentSchema.pre("save", function (next) {
    this.updatedAt = new Date();
    next();
});

// ------------------- Model -------------------
const DeploymentModel = mongoose.model("Deployment", DeploymentSchema);

module.exports = {
    DeploymentModel,
    DeploymentState,
};
