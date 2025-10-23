import express from 'express';
import dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import Razorpay from 'razorpay';
import cors from 'cors';
import crypto from 'crypto';
import { connectDb } from './db.js';
import CreditPurchaseModel from './model/payment.model.js';
import UserModel from './model/user.model.js';
import CreditTransactionModel from './model/creditTransaction.model.js';
import { authMiddleware } from './middleware/auth.middleware.js';
import { getSecrets } from './utils/secrets.js';

dotenv.config();
const app = express();

app.use(cors({
  origin: "http://localhost:3000",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());


// Choose Razorpay keys based on environment
const razorpayKeyId = process.env.RAZORPAY_KEY_ID || global?.secrets?.razorpay_key_id;
const razorpayKeySecret = process.env.RAZORPAY_KEY_SECRET || global?.secrets?.razorpay_key_secret;

if (!razorpayKeyId || !razorpayKeySecret) throw new Error("Razorpay keys are not set");

const razorpay = new Razorpay({
  key_id: razorpayKeyId,
  key_secret: razorpayKeySecret
});

app.post('/payment/create-order', authMiddleware, async (req, res) => {
  try {
    const { amount, currency = "INR", credits } = req.body;

    if (!amount || !credits) throw new Error("Missing amount or credits");

    const options = {
      amount, // amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);

    return res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        credits,
        receipt: order.receipt,
      },
    });

  } catch (error) {
    console.error("Create order error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
});

app.post("/payment/verify-order", authMiddleware, async (req, res) => {
  try {
    const userId = req?.user?.userId;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, credits, amount } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw new Error("Missing payment verification fields");
    }

    // Verify Razorpay signature
    const hmac = crypto.createHmac("sha256", razorpayKeySecret);
    hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
    const generated_signature = hmac.digest("hex");

    if (razorpay_signature !== generated_signature) {
      throw new Error("Payment verification failed");
    }

    // Update or create CreditPurchase record
    await CreditPurchaseModel.findOneAndUpdate(
      { orderId: razorpay_order_id },
      {
        userId: userId,
        paymentId: razorpay_payment_id,
        status: "paid",
        credits,
        amount,
      },
      { new: true, upsert: true }
    );

    // Update User credits
    const user = await UserModel.findByIdAndUpdate(
      userId,
      { $inc: { credits } },
      { new: true }
    );

    // Log transaction
    await CreditTransactionModel.create({
      userId: userId,
      type: "credit",
      amount,
      reason: "Credit purchase",
      relatedEntity: razorpay_payment_id,
      balanceAfter: user?.credits,
    });

    return res.status(200).json({
      success: true,
      message: "Payment verified successfully",
      data: {
        credits,
        amount,
        balance: user?.credits,
      },
    });

  } catch (error) {
    console.error("Verify order error:", error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : "Internal Server Error",
    });
  }
});

const PORT = process.env.PORT || 8003;

app.listen(PORT, async () => {
  // const secrets = await getSecrets();
  // global.secrets = secrets;
  await connectDb();
  console.log(`Payments Server running on port ${PORT}`);
});
