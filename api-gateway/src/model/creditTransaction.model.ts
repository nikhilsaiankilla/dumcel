import mongoose, { Schema, Document, Model } from "mongoose";
import { IUser } from "./user.model";

export interface ICreditTransaction extends Document {
    user: IUser["_id"];
    type: "credit" | "debit";
    amount: number;
    reason: string;
    relatedEntity?: string; // e.g. "paymentId" or "taskId"
    createdAt: Date;
    balanceAfter: number; // user balance after transaction
}

const CreditTransactionSchema: Schema<ICreditTransaction> = new Schema({
    user: {
        type: Schema.Types.ObjectId,
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
        type: String,
        required: false,
        trim: true,
    },
    balanceAfter: {
        type: Number,
        required: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

export const CreditTransactionModel: Model<ICreditTransaction> =
    mongoose.model<ICreditTransaction>("CreditTransaction", CreditTransactionSchema);
