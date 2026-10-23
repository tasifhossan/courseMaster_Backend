// controller for course-related routes

const courseService = require("../services/course.service");
const connectDB = require("../config/db");

const getCourses = async (req, res) => {
  try {
    // Ensure DB connection before processing request (for serverless)
    await connectDB();
    const data = await courseService.getCourses(req.query);
    res.json(data);
  } catch (err) {
    console.error("Get courses error:", err.message);
    res.status(400).json({ message: err.message || "Failed to fetch courses" });
  }
};

const getCourseById = async (req, res) => {
  try {
    const course = await courseService.getCourseById(req.params.id);
    res.json(course);
  } catch (err) {
    if (err.message === "Invalid course ID") {
      return res.status(400).json({ message: err.message });
    }
    if (err.message === "Course not found") {
      return res.status(404).json({ message: err.message });
    }
    res.status(400).json({ message: err.message });
  }
};

module.exports = { getCourses, getCourseById };
