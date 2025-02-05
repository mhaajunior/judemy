import { Request, Response } from "express";
import Stripe from "stripe";
import dotenv from "dotenv";
import prisma from "../../lib/prisma";

dotenv.config();

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error(
    "STRIPE_SECRET_KEY is required but was not found in env variables"
  );
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const listTransaction = async (
  req: Request,
  res: Response
): Promise<void> => {
  const userId = req.query.userId as string;

  try {
    const transactions = userId
      ? await prisma.transaction.findMany({ where: { userId } })
      : await prisma.transaction.findMany({});

    res.json({
      message: "Transactions retrieved successfully",
      data: transactions,
    });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving transactions", error });
  }
};

export const createStripePaymentIntent = async (
  req: Request,
  res: Response
): Promise<void> => {
  let { amount } = req.body;

  if (!amount || amount <= 0) {
    amount = 50;
  }

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: "never",
      },
    });

    res.json({
      message: "",
      data: {
        clientSecret: paymentIntent.client_secret,
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating stripe payment intent", error });
  }
};

export const createTransaction = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { transactionId, userId, courseId, amount, paymentProvider } = req.body;

  try {
    // 1. get course
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: { include: { chapters: true } },
      },
    });
    if (!course) {
      res.status(404).json({ message: "Course not found" });
      return;
    }

    // 2. create transaction record
    await prisma.transaction.create({
      data: {
        userId,
        transactionId,
        courseId,
        amount,
        paymentProvider,
      },
    });

    // 3. create initial course progress
    const { id: courseProgressId } = await prisma.userCourseProgress.create({
      data: {
        userId,
        courseId,
        overallProgress: 0,
      },
    });

    for (const section of course.sections) {
      const { id: sectionProgressId } = await prisma.sectionProgress.create({
        data: {
          userCourseProgressId: courseProgressId,
        },
      });

      for (const chapter of section.chapters) {
        await prisma.chapterProgress.create({
          data: {
            sectionProgressId,
            completed: false,
          },
        });
      }
    }

    // 4. add enrollment to relevant course
    await prisma.enrollment.create({
      data: {
        userId,
        courseId,
      },
    });

    res.json({ message: "Purchase course successfully", data: course });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error creating transaction and enrollment", error });
  }
};
