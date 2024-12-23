import express from "express";
import {
  createStripePaymentIntent,
  createTransaction,
  listTransaction,
} from "../controllers/transactionController";

const router = express.Router();

router.get("/", listTransaction);
router.post("/", createTransaction);
router.post("/stripe/payment-intent", createStripePaymentIntent);

export default router;
