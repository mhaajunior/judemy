import { Request, Response } from "express";
// import AWS from "aws-sdk";
import { getAuth } from "@clerk/express";
import prisma from "../../lib/prisma";
import { Level, Status } from "@prisma/client";

// const s3 = new AWS.S3();

export const listCourses = async (
  req: Request,
  res: Response
): Promise<void> => {
  const category = req.query.category as string;
  const userId = req.query.user as string;
  try {
    let whereObj: any = {};

    if (userId) {
      whereObj.enrollments = {
        some: {
          userId, // Filter courses where the user is enrolled
        },
      };
    }

    if (category && category !== "all") {
      whereObj.category = category;
    }

    const courses = await prisma.course.findMany({
      where: whereObj, // Filter by category if it's specified and not "all"
      include: {
        sections: {
          include: {
            chapters: { orderBy: { order: "asc" } },
          },
        },
        enrollments: true,
      },
    });

    res.json({ message: "Courses retrieved successfully", data: courses });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving courses", error });
  }
};

export const getCourse = async (req: Request, res: Response): Promise<void> => {
  const { courseId } = req.params;
  try {
    const course = await prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: { include: { chapters: { orderBy: { order: "asc" } } } },
        enrollments: true,
      },
    });
    if (!course) {
      res.status(404).json({ message: "Course not found" });
      return;
    }
    res.json({ message: "Course retrieved successfully", data: course });
  } catch (error) {
    res.status(500).json({ message: "Error retrieving course", error });
  }
};

export const createCourse = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { teacherId, teacherName } = req.body;

    if (!teacherId || !teacherName) {
      res.status(400).json({ message: "Teacher Id and name are required" });
      return;
    }

    const newCourse = await prisma.course.create({
      data: {
        teacherId,
        teacherName,
        title: "Untitled Course",
        description: "",
        category: "Uncategorized",
        image: "",
        price: 0,
        level: Level.BEGINNER,
        status: Status.DRAFT,
      },
    });

    res.json({ message: "Course created successfully", data: newCourse });
  } catch (error) {
    res.status(500).json({ message: "Error creating course", error });
  }
};

export const updateCourse = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { courseId } = req.params;
  const updateData = { ...req.body };
  const { userId } = getAuth(req);
  let sectionsData: any = [];

  try {
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

    if (course.teacherId !== userId) {
      res.status(403).json({ message: "Not authorized to update this course" });
      return;
    }

    if (updateData.price) {
      const price = parseInt(updateData.price);
      if (isNaN(price)) {
        res.status(400).json({
          message: "Invalid price format",
          error: "Price must be a valid number",
        });
        return;
      }
      updateData.price = price * 100;
    }

    if (updateData.sections) {
      sectionsData =
        typeof updateData.sections === "string"
          ? JSON.parse(updateData.sections)
          : updateData.sections;
    }

    await prisma.$transaction(async (tx) => {
      await tx.section.deleteMany({ where: { courseId } });

      await tx.course.update({
        where: {
          id: courseId,
        },
        data: {
          title: updateData.title,
          description: updateData.description,
          category: updateData.category,
          price: updateData.price,
          status: updateData.status,
        },
      });

      for (const section of sectionsData) {
        await tx.section.create({
          data: {
            id: section.id,
            title: section.title,
            description: section.description,
            courseId,
          },
        });

        for (const [index, chapter] of section.chapters.entries()) {
          await tx.chapter.create({
            data: {
              id: chapter.id,
              title: chapter.title,
              content: chapter.content,
              sectionId: section.id,
              type: chapter.type,
              video: chapter.video,
              order: index + 1,
            },
          });
        }
      }
    });

    res.json({ message: "Course updated successfully", data: course });
  } catch (error) {
    res.status(500).json({ message: "Error updating course", error });
  }
};

export const deleteCourse = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { courseId } = req.params;
  const { userId } = getAuth(req);

  try {
    const course = await prisma.course.findUnique({ where: { id: courseId } });
    if (!course) {
      res.status(404).json({ message: "Course not found" });
      return;
    }

    if (course.teacherId !== userId) {
      res.status(403).json({ message: "Not authorized to delete this course" });
      return;
    }

    await prisma.course.delete({ where: { id: courseId } });

    res.status(204).json({ message: "Course deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting course", error });
  }
};

export const getUploadVideoUrl = async (
  req: Request,
  res: Response
): Promise<void> => {
  // const { fileName, fileType } = req.body;
  // if (!fileName || !fileType) {
  //   res.status(400).json({ message: "File name and type are required" });
  //   return;
  // }
  // try {
  //   const uniqueId = uuidv4();
  //   const s3Key = `videos/${uniqueId}/${fileName}`;
  //   const s3Params = {
  //     Bucket: process.env.S3_BUCKET_NAME || "",
  //     Key: s3Key,
  //     Expires: 60,
  //     ContentType: fileType,
  //   };
  //   const uploadUrl = s3.getSignedUrl("putObject", s3Params);
  //   const videoUrl = `${process.env.CLOUDFRONT_DOMAIN}/videos/${uniqueId}/${fileName}`;
  //   res.json({
  //     message: "Upload URL generated successfully",
  //     data: { uploadUrl, videoUrl },
  //   });
  // } catch (error) {
  //   res.status(500).json({ message: "Error generating upload URL", error });
  // }
};
