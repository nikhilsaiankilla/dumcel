const mongoose = require("mongoose");

const CreditPurchaseSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  amount: {
    type: Number,
    required: true, // total INR amount paid
  },
  credits: {
    type: Number,
    required: true, // credits granted
  },
  orderId: {
    type: String,
    required: true,
    unique: true,
    trim: true, // Razorpay order ID
  },
  paymentId: {
    type: String,
    required: false, // Razorpay payment ID after success
    trim: true,
  },
  status: {
    type: String,
    enum: ["created", "paid", "failed"],
    default: "created",
  },
  currency: {
    type: String,
    default: "INR",
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

// Automatically update updatedAt on save
CreditPurchaseSchema.pre("save", function (next) {
  this.updatedAt = new Date();
  next();
});

const CreditPurchaseModel = mongoose.model("CreditPurchase", CreditPurchaseSchema);

module.exports = CreditPurchaseModel;
