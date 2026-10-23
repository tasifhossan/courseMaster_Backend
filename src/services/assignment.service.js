const mongoose = require("mongoose");
const Course = require("../models/Course");
const AssignmentSubmission = require("../models/AssignmentSubmission");
const Enrollment = require("../models/Enrollment");

const submitAssignment = async (studentId, payload) => {
  const { courseId, lessonId, answerType, answer } = payload;

  if (!courseId || !mongoose.Types.ObjectId.isValid(courseId)) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  const course = await Course.findById(courseId);
  if (!course) {
    const error = new Error("Course not found");
    error.statusCode = 404;
    throw error;
  }

  // ensure student enrolled
  const enrolled = await Enrollment.findOne({ student: studentId, course: courseId });
  if (!enrolled) {
    const error = new Error("You are not enrolled in this course");
    error.statusCode = 403;
    throw error;
  }

  if (!lessonId || !mongoose.Types.ObjectId.isValid(lessonId)) {
    const error = new Error("Lesson not found in this course");
    error.statusCode = 404;
    throw error;
  }

  let foundLesson = null;
  if (course.syllabus) {
    for (const mod of course.syllabus) {
      const l = mod.lessons?.id ? mod.lessons.id(lessonId) : mod.lessons?.find((x) => String(x._id) === String(lessonId));
      if (l) {
        foundLesson = l;
        break;
      }
    }
  }

  if (!foundLesson) {
    const error = new Error("Lesson not found in this course");
    error.statusCode = 404;
    throw error;
  }

  if (!foundLesson.assignmentPrompt || !foundLesson.assignmentPrompt.trim()) {
    const error = new Error("Lesson is not an assignment lesson");
    error.statusCode = 400;
    throw error;
  }

  const submission = await AssignmentSubmission.create({
    student: studentId,
    course: courseId,
    lessonId,
    answerType,
    answer,
  });

  return submission;
};

const getMySubmissions = async (studentId, courseId = null) => {
  const filter = { student: studentId };
  if (courseId) filter.course = courseId;

  return AssignmentSubmission.find(filter)
    .populate("course", "title")
    .populate("reviewer", "name")
    .sort({ createdAt: -1 });
};

// Get assignment statistics for a course
const getAssignmentStats = async (studentId, courseId) => {
  const submissions = await AssignmentSubmission.find({
    student: studentId,
    course: courseId,
  })
    .populate("reviewer", "name")
    .sort({ createdAt: -1 });

  if (submissions.length === 0) {
    return {
      average: 0,
      totalAssignments: 0,
      reviewedCount: 0,
      submissions: [],
    };
  }

  // Calculate average from graded assignments only
  const gradedSubmissions = submissions.filter((s) => s.grade !== null && s.grade !== undefined);
  const average = gradedSubmissions.length > 0
    ? Math.round(gradedSubmissions.reduce((sum, s) => sum + s.grade, 0) / gradedSubmissions.length)
    : 0;

  return {
    average,
    totalAssignments: submissions.length,
    reviewedCount: submissions.filter((s) => s.status === "reviewed").length,
    submissions: submissions.map((s) => ({
      _id: s._id,
      lessonId: s.lessonId,
      answer: s.answer,
      answerType: s.answerType,
      status: s.status,
      grade: s.grade,
      reviewNotes: s.reviewNotes,
      reviewer: s.reviewer,
      submittedAt: s.createdAt,
      reviewedAt: s.updatedAt,
    })),
  };
};

module.exports = { submitAssignment, getMySubmissions, getAssignmentStats };
