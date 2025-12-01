const Stripe = require("stripe")
const express = require('express')
const dotenv = require ( "dotenv");

dotenv.config();
const router = express.Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Create PaymentIntent
router.post("/create-payment-intent", async (req, res) => {
  try {
    const { amount } = req.body; // amount in paise for INR (₹1 = 100 paise)

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: "inr",
      automatic_payment_methods: {
        enabled: true,
      },
    });

    res.send({
      clientSecret: paymentIntent.client_secret,
    });
  } catch (error) {
    console.error("Stripe error:", error);
    res.status(500).json({ message: "Payment failed", error });
  }
});

module.exports = router;
