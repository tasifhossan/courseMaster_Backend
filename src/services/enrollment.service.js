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

const completeLesson = async (studentId, enrollId, lessonId) => {
  if (!mongoose.Types.ObjectId.isValid(enrollId)) {
    throw new Error("Enrollment not found");
  }

  const enrollment = await Enrollment.findById(enrollId);
  if (!enrollment) throw new Error("Enrollment not found");

  if (enrollment.student.toString() !== studentId.toString()) {
    throw new Error("Not authorized to modify this enrollment");
  }

  if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
    throw new Error("Lesson does not belong to this course");
  }

  const course = await Course.findById(enrollment.course);
  if (!course) throw new Error("Course not found");

  const lessonExists = course.syllabus?.some((mod) =>
    mod.lessons?.some((l) => l._id.toString() === lessonId.toString())
  );

  if (!lessonExists) {
    throw new Error("Lesson does not belong to this course");
  }

  // avoid duplicates
  const alreadyDone = enrollment.progress.completedLessons
    .map(String)
    .includes(String(lessonId));

  if (!alreadyDone) {
    enrollment.progress.completedLessons.push(lessonId);
  }

  // calculate percent
  const totalLessons = course.syllabus
    ? course.syllabus.reduce((sum, mod) => sum + (mod.lessons?.length || 0), 0)
    : 0;

  const completed = enrollment.progress.completedLessons.length;
  enrollment.progress.percent =
    totalLessons === 0 ? 0 : Math.round((completed / totalLessons) * 100);

  await enrollment.save();
  return enrollment;
};

module.exports = { enrollCourse, getMyEnrollments, completeLesson };
