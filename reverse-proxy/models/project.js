const mongoose = require('mongoose')
const { Schema } = mongoose;

const Project = new Schema({
    // A unique identifier for the project. Mongoose automatically handles this with _id.
    // id: { 
    //     type: Schema.Types.ObjectId,
    // },

    // The name of the project.
    projectName: {
        type: String,
        required: false,
        trim: true,
    },

    // The ID of the user who owns the project.
    userId: {
        type: Schema.Types.ObjectId,
        required: true,
        ref: 'User' // This creates a reference to the 'User' model.
    },

    // URL to the git repository for the project.
    gitUrl: {
        type: String,
        required: true,
        trim: true
    },

    // The subdomain for the project, e.g., 'my-project.app.com'.
    subDomain: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    favicon: {
        type: String,
        required: false,
    },

    // Timestamp for when the document was created.
    createdAt: {
        type: Date,
        default: Date.now,
    },

    // Timestamp for when the document was last updated.
    updatedAt: {
        type: Date,
        default: Date.now,
    }
});

// Using a pre-save hook to update the updatedAt field on every save.
Project.pre('save', function (next) {
    this.updatedAt = Date.now();
    next();
});

const ProjectModel = mongoose.model('Project', Project);

module.exports = ProjectModel;