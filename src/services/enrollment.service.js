const mongoose = require("mongoose");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");

const enrollCourse = async (studentId, courseId, batchId = null) => {
  if (!mongoose.Types.ObjectId.isValid(courseId)) {
    throw new Error("Course not found");
  }

  const course = await Course.findById(courseId);
  if (!course) throw new Error("Course not found");

  if (batchId) {
    if (
      !mongoose.Types.ObjectId.isValid(batchId) ||
      !course.batches?.some((b) => b._id.toString() === batchId.toString())
    ) {
      throw new Error("Invalid batch selected for this course");
    }
  }

  // Check if already enrolled
  const existingEnrollment = await Enrollment.findOne({
    student: studentId,
    course: courseId,
  });

  if (existingEnrollment) {
    throw new Error("Already enrolled in this course");
  }

  // Create new enrollment
  try {
    const enrollment = await Enrollment.create({
      student: studentId,
      course: courseId,
      batchId: batchId || null,
      progress: { completedLessons: [], percent: 0 },
    });

    return enrollment;
  } catch (err) {
    if (err.code === 11000) {
      throw new Error("Already enrolled in this course");
    }
    throw err;
  }
};

const getMyEnrollments = async (studentId) => {
  return Enrollment.find({ student: studentId })
    .populate("course", "title instructorName price category tags")
    .sort({ createdAt: -1 });
};

const completeLesson = async (enrollId, lessonId) => {
  const enrollment = await Enrollment.findById(enrollId);
  if (!enrollment) throw new Error("Enrollment not found");

  // avoid duplicates
  const alreadyDone = enrollment.progress.completedLessons
    .map(String)
    .includes(String(lessonId));

  if (!alreadyDone) {
    enrollment.progress.completedLessons.push(lessonId);
  }

  // calculate percent
  const course = await Course.findById(enrollment.course);
  const totalLessons = course.syllabus.reduce(
    (sum, mod) => sum + mod.lessons.length,
    0
  );

  const completed = enrollment.progress.completedLessons.length;
  enrollment.progress.percent =
    totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100);

  // Missing await on async Mongoose save (Code-9 bug)
  enrollment.save();
  return enrollment;
};

module.exports = { enrollCourse, getMyEnrollments, completeLesson };
