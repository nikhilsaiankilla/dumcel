import express from 'express';
import dotenv from 'dotenv';
import cookieParser from "cookie-parser";
import Razorpay from 'razorpay';
import cors from 'cors';
import crypto from 'crypto';
import { connectDb } from './db.js';

dotenv.config();
const app = express();

app.use(cors({
    origin: "http://localhost:3000",
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

app.post('/payment/create-order', async (req, res) => {
    try {
        const { amount, currency = "INR", credits } = req.body;

        if (!amount || !credits) {
            return res.status(400).json({ error: "Missing amount or credits" });
        }

        const options = {
            amount, // amount in paise
            currency,
            receipt: `receipt_${Date.now()}`,
        };

        const order = await razorpay.orders.create(options);

        // TODO: Here you can store the order in your DB
        // e.g., CreditPurchaseModel.create({ userId, amount, credits, orderId: order.id, status: 'created' })

        return res.status(200).json({
            success: true,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            credits,
            receipt: order.receipt,
        });

    } catch (error) {
        console.error("Create order error:", error);
        return res.status(500).json({ error: error.message });
    }
});

app.post('/payment/verify-order', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            return res
                .status(400)
                .json({ success: false, message: "Missing payment verification fields" });
        }

        const keySecret = process.env.RAZORPAY_KEY_SECRET;
        const hmac = crypto.createHmac("sha256", keySecret);
        hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
        const generated_signature = hmac.digest("hex");

        if (razorpay_signature === generated_signature) {
            // Payment verified

            // TODO: Update the order status in DB to 'paid'
            // TODO: Add credits to the user account
            // TODO: Insert a record in CreditTransaction collection for audit

            return res.json({ success: true, message: "Payment verified successfully" });
        } else {
            return res.json({ success: false, message: "Payment verification failed" });
        }

    } catch (error) {
        console.error("Verify order error:", error);
        return res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 8003;

app.listen(PORT, async () => {
    await connectDb();
    console.log(`Payments Server running on port ${PORT}`);
});
