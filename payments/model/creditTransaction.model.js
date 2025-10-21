const mongoose = require("mongoose");

const CreditTransactionSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
    type: {
        type: String,
        enum: ["credit", "debit"],
        required: true,
    },
    amount: {
        type: Number,
        required: true,
        min: 0,
    },
    reason: {
        type: String,
        required: true,
        trim: true,
    },
    relatedEntity: {
        type: String, // e.g. "paymentId" or "taskId"
        required: false,
        trim: true,
    },
    balanceAfter: {
        type: Number,
        required: true, // user balance after transaction
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

const CreditTransactionModel = mongoose.model(
    "CreditTransaction",
    CreditTransactionSchema
);

module.exports = CreditTransactionModel;
