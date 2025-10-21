const mongoose = require("mongoose");

// User schema
const UserSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    photo: {
        type: String,
        required: false,
    },
    githubId: {
        type: String,
        required: false,
        unique: true,
        sparse: true,
    },
    password: {
        type: String,
        required: false,
    },
    isGitConnected: {
        type: Boolean,
        default: false,
    },
    credits: {
        type: Number,
        default: 0,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// User model
const UserModel = mongoose.model("User", UserSchema);

module.exports = UserModel;
