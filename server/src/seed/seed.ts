import { Level, Provider, Status, Type } from "@prisma/client";
import prisma from "../../lib/prisma";
import courses from "./data/courses.json";
import sections from "./data/sections.json";
import chapters from "./data/chapters.json";
import enrollments from "./data/enrollments.json";
import transactions from "./data/transactions.json";

async function seed() {
  try {
    for (const course of courses) {
      await prisma.course.upsert({
        where: { id: course.id },
        update: {},
        create: {
          id: course.id,
          teacherId: course.teacherId,
          teacherName: course.teacherName,
          title: course.title,
          description: course.description,
          category: course.category,
          image: course.image,
          price: course.price,
          level: course.level as Level,
          status: course.status as Status,
        },
      });
    }

    for (const section of sections) {
      await prisma.section.upsert({
        where: { id: section.id },
        update: {},
        create: {
          id: section.id,
          courseId: section.courseId,
          title: section.title,
          description: section.description,
        },
      });
    }

    for (const chapter of chapters) {
      await prisma.chapter.upsert({
        where: { id: chapter.id },
        update: {},
        create: {
          id: chapter.id,
          sectionId: chapter.sectionId,
          type: chapter.type as Type,
          title: chapter.title,
          content: chapter.content,
          video: chapter.video,
          order: chapter.order,
        },
      });
    }

    for (const enrollment of enrollments) {
      await prisma.enrollment.upsert({
        where: {
          uniqueEnrollment: {
            courseId: enrollment.courseId,
            userId: enrollment.userId,
          },
        },
        update: {},
        create: {
          courseId: enrollment.courseId,
          userId: enrollment.userId,
        },
      });
    }

    for (const transaction of transactions) {
      await prisma.transaction.upsert({
        where: { transactionId: transaction.transactionId },
        update: {},
        create: {
          userId: transaction.userId,
          transactionId: transaction.transactionId,
          courseId: transaction.courseId,
          paymentProvider: transaction.paymentProvider as Provider,
          amount: transaction.amount,
        },
      });
    }

    console.log("Seeding completed successfully");
  } catch (error) {
    console.error("Error seeding data:", error);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
