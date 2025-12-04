const express = require('express');
const Razorpay = require('razorpay');
const crypto = require("crypto");

require('dotenv').config();
const router = express.Router();

// Initialize Razorpay instance with key ID and secret from environment variables
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
// Route to create a new payment order
router.post('/create-order', async (req, res) => {
  const { amount, currency, receipt } = req.body;
  console.log(process.env.RAZORPAY_KEY_ID);
  console.log();

  const options = {
    amount: amount, // Amount in smallest currency unit
    currency: currency || 'INR',
    receipt: receipt || `receipt_${Date.now()}`,
  };
  try {
    const order = await razorpay.orders.create(options);
    console.log(order);
    res.status(201).json({ order });

  } catch (error) {
    console.log(error);
    res.status(500).json({ error: 'Failed to create order', details: error.message });
  }
});

router.post("/verify", async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(sign)
      .digest("hex");

    if (expectedSign === razorpay_signature) {
      return res.json({ success: true, message: "Payment verified" });
    } else {
      return res.json({ success: false, message: "Payment verification failed" });
    }

  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
